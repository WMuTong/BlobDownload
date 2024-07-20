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
        return { chunk: await response.blob() };
    }
    else {
        return {}
    }
}
async function fetchRangeAudio(url, start, end) {
    const response = await fetch(url, {
        headers: {
            'Range': `bytes=${start}-${end}`
        },
        method: 'GET',
        mode: 'cors',
        credentials: 'include'
    });

    if (response.status === 206 || response.ok) {
        return { audioChunk: await response.blob() };
    }
    else {
        return {}
    }
}

async function downloadVideoByOnlyFans(url, title = new Date().getTime()) {
    try {
        // 解析url参数
        const urlAfter = url.replace('.mpd', '');
        // 获取视频分片大小
        const chunkSize = 159243;
        // 获取音频分片大小
        const audioChunkSize = 39953;
        // 片段集合
        const chunks = [];

        const videoRanges = [];
        const audioRanges = [];

        // 文件总大小，从请求中获取并更新
        let fileSize = 0;

        // 起始值
        let start = 0;
        let audioStart = 0;

        const whileFetch = async (isVideoEnd, isAudioEnd) => {
            const end = !!fileSize ? Math.min(start + chunkSize - 1, fileSize - 1) : start + chunkSize - 1;
            const audioEnd = !!fileSize ? Math.min(audioStart + audioChunkSize - 1, fileSize - 1) : audioStart + audioChunkSize - 1;

            let chunk, audioChunk;
            if(!isVideoEnd) {
                try {
                    const _chunk = await fetchRange(`${urlAfter}_720p.mp4`, start, end);
                    chunk = _chunk.chunk;
                    chunks.push(chunk);

                    videoRanges.push(`${start}-${end}`);
                } catch (e) {console.log(e)}
            }
            if(!isAudioEnd) {
                try {
                    const _audioChunk = await fetchRangeAudio(`${urlAfter}_audio.mp4`, audioStart, audioEnd);
                    audioChunk = _audioChunk.audioChunk;
                    chunks.push(audioChunk);

                    audioRanges.push(`${audioStart}-${audioEnd}`);
                } catch (e) {console.log(e)}
            }

            if(!!chunk) start += chunkSize;
            if(!!audioChunk) audioStart += audioChunkSize;

            await setTimeout(() => {}, 500);
            if(!isVideoEnd || !isAudioEnd) await whileFetch(!chunk, !audioChunk);
        };
        await whileFetch();

        console.log(videoRanges, audioRanges);
        console.log(JSON.stringify(videoRanges), JSON.stringify(audioRanges));

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

    if (event.data.type && event.data.type.indexOf('POPUP') > -1) {
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
    }
});