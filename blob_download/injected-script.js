// 分段下载
async function fetchRange(url, start, end) {
    const response = await fetch(url, {
        headers: {
            'Range': `bytes=${start}-${end}`
        },
        method: 'GET',
        mode: 'cors',
        credentials: 'include'
    });

    if (response.status === 206 || response.ok) {
        return await response.blob();
    } else {
        throw new Error(`Failed to fetch range ${start}-${end}: ${response.status} ${response.statusText}`);
    }
}

async function downloadVideo(url, target) {
    try {
        // 解析url参数
        const urlParams = JSON.parse(decodeURIComponent(url.replace('https://web.telegram.org/k/stream/', '')));
        // 获取视频总大小
        const fileSize = urlParams.size;
        // 获取视频分片大小
        const chunkSize = 524288;
        // 片段集合
        const chunks = [];

        // 起始值
        let start = 0;

        const whileFetch = async () => {
            const end = Math.min(start + chunkSize - 1, fileSize - 1);
            const chunk = await fetchRange(url, start, end);
            chunks.push(chunk);
            start += chunkSize;

            let progress = parseInt(end / fileSize * 100);
            target.innerText = `合成中 ${progress}%`;

            if (start < fileSize) await whileFetch();
        };
        await whileFetch();

        target.innerText = `开始下载 ${(fileSize / 1024 / 1024).toFixed(2)}MB`;

        const completeBlob = new Blob(chunks, { type: 'video/mp4' });
        const downloadUrl = window.URL.createObjectURL(completeBlob);
        const a = document.createElement('a');

        a.style.display = 'none';
        a.href = downloadUrl;
        a.download = `${fileSize}.mp4`;
        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error fetching video:', error);
    }
}

async function downloadImage(url, target) {
    try {
        // 创建一个隐藏的 <a> 元素用于触发下载
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';

        // 设置 <a> 元素的 href 属性为 Blob URL
        a.href = url;

        // 设置下载文件名（可选）
        a.download = (new Date().getTime()) + '.png'; // 你可以在这里设置下载文件的名字

        // 触发点击事件以开始下载
        a.click();

        // 清理，移除 <a> 元素并释放可能占用的资源
        document.body.removeChild(a);


        // // 解析url参数
        // const urlParams = JSON.parse(decodeURIComponent(url.replace('https://web.telegram.org/k/stream/', '')));
        // // 获取视频总大小
        // const fileSize = urlParams.size;
        // // 获取视频分片大小
        // const chunkSize = 524288;
        // // 片段集合
        // const chunks = [];

        // // 起始值
        // let start = 0;

        // const whileFetch = async () => {
        //     const end = Math.min(start + chunkSize - 1, fileSize - 1);
        //     const chunk = await fetchRange(url, start, end);
        //     chunks.push(chunk);
        //     start += chunkSize;

        //     let progress = parseInt(end / fileSize * 100);
        //     target.innerText = `合成中 ${progress}%`;

        //     if (start < fileSize) await whileFetch();
        // };
        // await whileFetch();

        // target.innerText = `开始下载 ${(fileSize / 1024 / 1024).toFixed(2)}MB`;

        // const completeBlob = new Blob(chunks, { type: 'video/mp4' });
        // const downloadUrl = window.URL.createObjectURL(completeBlob);
        // const a = document.createElement('a');

        // a.style.display = 'none';
        // a.href = downloadUrl;
        // a.download = `${fileSize}.mp4`;
        // document.body.appendChild(a);
        // a.click();

        // window.URL.revokeObjectURL(downloadUrl);
        // document.body.removeChild(a);
    } catch (error) {
        console.error('Error fetching video:', error);
    }
}

window.fetchRange = fetchRange;
window.downloadVideo = downloadVideo;

var parent = document.querySelectorAll('.bubbles');

function startDownVideo(event) {
    var target = event.target;
    if (target.classList.contains('download_video')) {
        event.stopPropagation();
        downloadVideo(target.getAttribute('data-video-src'), target);
    }
}

function startDownImage(event) {
    var target = event.target;
    if (target.classList.contains('download_img')) {
        event.stopPropagation();
        downloadImage(target.getAttribute('data-img-src'), target);
    }
}

// 绑定事件委托
!!parent && !!parent.length && parent?.[0].addEventListener('click', startDownVideo);

const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.tagName === 'SPAN' && node.classList.contains('download_video')) {
                    node.addEventListener('click', startDownVideo);
                }
                if (node.tagName === 'SPAN' && node.classList.contains('download_img')) {
                    node.addEventListener('click', startDownImage);
                }
            });
        }
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});