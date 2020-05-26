function setupPing(canvas){
    if (canvas.getContext) {
        var ctx = canvas.getContext('2d');
        requestAnimationFrame(()=>{ping(ctx)})
    }
}
function ping(ctx){
    ctx.fillRect(0, 0, 1, 1);
    requestAnimationFrame(()=>{ping(ctx)})
}