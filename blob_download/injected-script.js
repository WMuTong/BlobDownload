window.Telegram = {
    // 分段下载
    async fetchRange(url, start, end) {
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
    },
    async downloadVideo(url, target) {
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
                const chunk = await window.Telegram.fetchRange(url, start, end);
                chunks.push(chunk);
                start += chunkSize;

                let progress = parseInt(end / fileSize * 100);
                target.innerText = `合成中 ${progress}%`;

                if(start < fileSize) await whileFetch();
            };
            await whileFetch();

            target.innerText = `开始下载 ${(fileSize / 1024 / 1024).toFixed(2)}MB`;

            const completeBlob = new Blob(chunks, { type: 'video/mp4' });
            const downloadUrl = window.URL.createObjectURL(completeBlob);
            const a = document.createElement('a');

            a.style.display = 'none';
            a.href = downloadUrl;
            a.download = 'video.mp4';
            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error fetching video:', error);
        }
    }
}

var parent = document.querySelectorAll('.bubbles');
// 绑定事件委托
parent?.[0].addEventListener('click', function (event) {
    var target = event.target;

    if (target.classList.contains('download_video')) {
        window.Telegram.downloadVideo(target.getAttribute('data-video-src'), target);
    }
});