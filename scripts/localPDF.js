const startPDF = (file)=>{
    let url = URL.createObjectURL(file);
    let pdfDoc = null,
        pageNum = 1,
        pageRendering = false,
        pageNumPending = null,
        scale = 2,
        canvas = document.getElementById('the-canvas'),
        ctx = canvas.getContext('2d');

    /**
     * Get page info from document, resize canvas accordingly, and render page.
     * @param num Page number.
     */
    function renderPage(num) {
        pageRendering = true;
        // Using promise to fetch the page
        pdfDoc.getPage(num).then(function(page) {
            var viewport = page.getViewport({scale: scale});
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Render PDF page into canvas context
            var renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            var renderTask = page.render(renderContext);

            // Wait for rendering to finish
            renderTask.promise.then(function() {
                pageRendering = false;
                if (pageNumPending !== null) {
                    // New page rendering is pending
                    renderPage(pageNumPending);
                    pageNumPending = null;
                }
            });
        });

        // Update page counters
        document.getElementById('page_num').textContent = num;

    }

    /**
     * If another page rendering in progress, waits until the rendering is
     * finised. Otherwise, executes rendering immediately.
     */
    function queueRenderPage(num) {
        if (pageRendering) {
            pageNumPending = num;
        } else {
            renderPage(num);
        }
    }
    setupPing(canvas);
    /**
     * Displays previous page.
     */
    function onPrevPage() {
        if (pageNum <= 1) {
            return;
        }
        pageNum--;
        queueRenderPage(pageNum);
    }
    document.getElementById('prev').addEventListener('click', onPrevPage);

    /**
     * Displays next page.
     */
    function onNextPage() {
        if (pageNum >= pdfDoc.numPages) {
            return;
        }
        pageNum++;
        queueRenderPage(pageNum);
    }
    document.getElementById('next').addEventListener('click', onNextPage);

    /**
     * Asynchronously downloads PDF.
     */
    pdfjsLib.getDocument(url).promise.then(function(pdfDoc_) {
        pdfDoc = pdfDoc_;
        document.getElementById('page_count').textContent = pdfDoc.numPages;

        // Initial/first page rendering
        renderPage(pageNum);
    });

    let client = AgoraRTC.createClient({
        mode: 'live',
        codec: "h264"
    });

    // Defines a client for Real Time Communication
    client.init(appid, () => console.log("AgoraRTC client initialized"), handleFail);

    client.join(null,channelid,null, (uid)=>{

        let teacher = database.ref(`/${appid}/${channelid}/pdf`);
        teacher.set(uid);
        teacher.onDisconnect().set(null);

        var frameRate = 30;
        var canvas = document.getElementById('the-canvas'); // canvas which is to be streamed to agora
        var mediaStream = canvas.captureStream();  // convert to mediaStream
        var videoSource = mediaStream.getVideoTracks()[0];  // get the videoSource


        var localStream = AgoraRTC.createStream({
            streamId:uid,
            video: true,
            audio: false,
            videoSource: videoSource // Pass in the video source to agora
        });

        localStream.setVideoProfile(quality);
        localStream.init(function(){

            client.publish(localStream); // Publish it to the channel
        });
        console.log(`App id : ${appid}\nChannel id : ${channelid}`);
    },handleFail);
};

let localPDF = new Vue({
    el:'#pdf',
    methods:{
        start(event){
            startPDF(event.target.files[0]);
        }
    }
});