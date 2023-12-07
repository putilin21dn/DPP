const express = require("express");
const body_parser = require("body-parser");
const ort = require("onnxruntime-node");
const jimp = require("jimp");
const fs = require("fs");

const app = express();
app.set("port", 8000);
app.use(body_parser.json({limit: '50mb'}));

let session = null;
const W = 720, H = 720;

function get_files(dir)
{
    fs.readdirSync(dir).forEach(file =>
    {
        let path = "/" + dir + "/" + file;
        app.get(path, (request, response) =>
        {
            response.sendFile(__dirname + path);
        });
    });
}

app.post("/detect", async (request, response) =>
{
    let base64 = request.body.image.split(';base64,');
    base64.push("something");
    let encoded = Buffer.from(base64[1], "base64");
    let img = null;
    try
    {
        img = await jimp.read(encoded);
    } 
    catch (error)
    {
        response.send({ success: false, error: "Incorrect image" });
        return;
    }
    let scale_w = img.getWidth() / W;
    let scale_h = img.getHeight() / H;
    img.resize(W, H, jimp.RESIZE_BILINEAR);
    let data_r = [], data_g = [], data_b = [];
    for (let y = 0; y < H; y++)
    {
        for (let x = 0; x < W; x++)
        {
            let color = jimp.intToRGBA(img.getPixelColor(x, y));
            data_r.push(color.r / 255.0);
            data_g.push(color.g / 255.0);
            data_b.push(color.b / 255.0);
        }
    }
    let data = data_r.concat(data_g.concat(data_b));
    let array = Float32Array.from(data);
    let tensor = new ort.Tensor('float32', array, [1, 3, W, H]);
    let feed = { input: tensor };
    let result = await session.run(feed);

    let n = result.output.dims[0] * result.output.dims[1];
    let boxes = [];
    for (let i = 0; i < n; i += 4)
    {
        if (result["1384"].data[i / 4] < 0.3)
            continue;
        let x1 = result.output.data[i];
        let y1 = result.output.data[i + 1];
        let x2 = result.output.data[i + 2];
        let y2 = result.output.data[i + 3];
        boxes.push(
        {
            x1: Math.floor(Math.min(x1 * scale_w, scale_w * W - 1)),
            y1: Math.floor(Math.min(y1 * scale_h, scale_h * H - 1)),
            x2: Math.floor(Math.min(x2 * scale_w, scale_w * W - 1)),
            y2: Math.floor(Math.min(y2 * scale_h, scale_h * H - 1))
        });
    }
    response.send({ success: true, boxes: boxes });
});

app.get("/", (request, response) =>
{
    response.sendFile(__dirname + "/client/index.html");
});

get_files("client");

async function start()
{
    session = await ort.InferenceSession.create('./model.onnx');
}

start();
app.listen(app.get("port"));