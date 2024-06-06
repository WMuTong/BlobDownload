/*-start-----------------海角相关--------------------*/
const haijiao = {
  // 配置
  config: {
    // 匹配规则
    match: {
      // 匹配规则
      rules: [
        {
          // 获取 m3u8 内容的接口
          rule: /^https:\/\/www\.haijiao\.com\/api\/address\/.*$/,
          // 在 haijiao.todo 中定义的对应处理方法
          todo: {
            'completed': 'addAwaitDownM3u8Url'
          }
        }
      ]
    }
  },
  /**
   * 检测符合的配置
   * @param {<string>} url '请求地址'
   * @param {'beforeRequest'|'completed'} type '响应位置'
   */
  detection: (details, type) => {
    for (let i = 0; i < haijiao.config.match.rules.length; i++) {
      const rule = haijiao.config.match.rules[i];
      if (details.url?.match(rule.rule)) {
        haijiao.todo?.[rule.todo?.[type]]?.(details);
        break;
      }
    }
  },
  // 执行
  todo: {
    "addAwaitDownM3u8Url": (details) => {
      chrome.tabs.sendMessage(
        details?.tabId,
        {
          type: 'HAIJIAO_ADDM3U8URLTOPOPUP',
          data: JSON.stringify(details)
        },
        {},
      );
    }
  }
};
/*-end-----------------海角相关--------------------*/

/*-start-----------------请求相关--------------------*/
// 在请求成功处理后触发
chrome.webRequest.onCompleted.addListener(
  function (details) {
    if (details.statusCode === 200) {
      haijiao.detection(details, 'completed');
    }
  },
  { urls: ["<all_urls>"] }
);
/*-end-----------------请求相关--------------------*/

/*-start-----------------消息相关--------------------*/
// 接收消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if(message.type === 'DOWNLOAD') {
    sendResponse(`background已收到消息: ${message.type} - ${JSON.stringify(message.data)}`)
    downloadFile(...message.data);
  };
  
});
/*-end-----------------消息相关--------------------*/

/*-start-----------------下载相关--------------------*/
// 通过url将文件下载到本地
async function downloadFile(url, name) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    // 使用 Chrome 的下载 API 下载文件
    chrome.downloads.download({
      url: url,
      filename: name,
      saveAs: true
    });

    return { success: true, message: 'Download started' };
  } catch (error) {
    console.error('Failed to download TS file:', error);
    return { success: false, error: error.message };
  }
}
/*-end-----------------下载相关--------------------*/