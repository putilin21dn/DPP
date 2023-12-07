function make_canvas(blob, boxes)
{
    // let canvas = document.getElementById('viewport');
    let canvas = document.createElement("canvas");
    ctx = canvas.getContext('2d');
    let img = new Image();
    img.onload = () => 
    {
        ctx.canvas.width = img.width;
        ctx.canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        ctx.strokeStyle = "rgb(0, 255, 0)"
        for (let i = 0; i < boxes.length; i++)
        {
            let w = boxes[i].x2 - boxes[i].x1;
            let h = boxes[i].y2 - boxes[i].y1;
            ctx.strokeRect(boxes[i].x1, boxes[i].y1, w, h);
        }
    }
    img.src = URL.createObjectURL(blob);
    return { canvas: canvas, count: boxes.length };
}

async function get_result(blob)
{ 
    let promise = new Promise((resolve, reject) => 
    {
        let reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
    let base64 = await promise;
    let response = await fetch("http://127.0.0.1:8000/detect",
    {
        method: "POST",
        headers:
        {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(
        {
            image: base64
        })
    });
    let ans = await response.json();
    if (ans.success)
        return make_canvas(blob, ans.boxes);
    else
        alert(ans.error);
    return null;
}

//selecting all required elements
const drop_area = document.querySelector(".drag-area");
const drag_text = drop_area.querySelector("header");
const button = drop_area.querySelector("button");
const input = drop_area.querySelector("input");
let file;

button.onclick = () => input.click();
input.addEventListener("change", () =>
{
    file = input.files[0];
    drop_area.classList.add("active");
    show_file();
});

drop_area.addEventListener("dragover", (event) => 
{
    event.preventDefault();
    drop_area.classList.add("active");
    drag_text.textContent = "Release to Upload File";
});

drop_area.addEventListener("dragleave", () => 
{
    drop_area.classList.remove("active");
    drag_text.textContent = "Drag & Drop to Upload File";
});

drop_area.addEventListener("drop", (event) => 
{
    event.preventDefault();
    file = event.dataTransfer.files[0];
    show_file();
});


async function show_file() 
{
    let type = file.type;
    let valid = ["image/jpeg", "image/jpg", "image/png"];
    if (valid.includes(type)) 
    {
        while (drop_area.lastChild)
            drop_area.removeChild(drop_area.lastChild);
        let result = await get_result(file);
        let text = document.querySelector([".text-result"]);
        text.style.display = "block";
        text.querySelector("#count").textContent = result.count;
        document.querySelector([".hidden-buttons"]).style.display = "block";
        let button = document.querySelector([".download-button"]);
        button.onclick = () => download_image(result.canvas);
        drop_area.appendChild(result.canvas);
    } 
    else 
    {
        alert("This is not an Image File!");
        drop_area.classList.remove("active");
        drag_text.textContent = "Drag & Drop to Upload File";
    }
}

function download_image(canvas)
{
    var link = document.createElement('a');
    link.download = "result.png";
    link.href = canvas.toDataURL();
    link.click();
}
