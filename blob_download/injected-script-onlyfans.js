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
        // const contentRange = response.headers.get('Content-Range');
        // console.log(contentRange);
        // if (contentRange) {
        //     const sizeMatch = contentRange.match(/\/(\d+)$/);
        //     console.log(sizeMatch)
        //     if (sizeMatch) {
        //         const fileSize = parseInt(sizeMatch[1], 10);
        //         return { chunk: await response.blob(), fileSize };
        //     }
        // }
        return { chunk: await response.blob() };
    } else {
        throw new Error(`Failed to fetch range ${start}-${end}: ${response.status} ${response.statusText}`);
    }
}
async function downloadVideoByOnlyFans(url, title = new Date().getTime()) {
    try {
        // 解析url参数
        const urlAfter = url.replace('.mpd', '_720p.mp4');
        // 获取视频分片大小
        const chunkSize = 524288;
        // 片段集合
        const chunks = [];

        // 文件总大小，从请求中获取并更新
        let fileSize = chunkSize + 1000;

        // 起始值
        let start = 0;

        const whileFetch = async () => {
            // const end = Math.min(start + chunkSize - 1, fileSize - 1);
            const end = start + chunkSize - 1;
            const { chunk } = await fetchRange(urlAfter, start, end);

            chunks.push(chunk);
            start += chunkSize;

            await whileFetch();
        };
        await whileFetch();

        const completeBlob = new Blob(chunks, { type: 'video/mp4' });
        const downloadUrl = window.URL.createObjectURL(completeBlob);
        const a = document.createElement('a');

        a.style.display = 'none';
        a.href = downloadUrl;
        a.download = `${title}.mp4`;
        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error fetching video:', error);
    }
}

// 监听来自 popup.js 或 background.js 的消息
window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.type !== 'message') return;
    const [type, todu] = event.data.type.split('_');
    if (type && type === 'POPUP') {
        switch (todu) {
            case "DOWNMPD":
                downloadVideoByOnlyFans(event.data.params.url, event.data.params.title);
                break;
            default:
                break;
        }
    }
});