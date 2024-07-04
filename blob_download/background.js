/*-start-----------------海角相关--------------------*/
const haijiao = {
  // 配置
  config: {
    // 匹配规则
    match: {
      // 匹配规则
      urls: [
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
   * 检测请求地址符合的配置
   * @param {<string>} url '请求地址'
   * @param {'beforeRequest'|'completed'} type '响应位置'
   */
  detectionFetchUrl: (details, type) => {
    for (let i = 0; i < haijiao.config.match.urls.length; i++) {
      const rule = haijiao.config.match.urls[i];
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
    },
    "downloadM3u8": downloadFile,
    "downloadPage": downloadPage
  }
};
/*-end-----------------海角相关--------------------*/

/*-start-----------------请求相关--------------------*/
// 在请求成功处理后触发
chrome.webRequest.onCompleted.addListener(
  function (details) {
    if (details.statusCode === 200) {
      haijiao.detectionFetchUrl(details, 'completed');
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
    haijiao.todo["downloadM3u8"](...message.data);
  };
  
});
/*-end-----------------消息相关--------------------*/

/*-start-----------------右键菜单--------------------*/
chrome.runtime.onInstalled.addListener(() => {
  // 添加右键菜单内容
  chrome.contextMenus.create({
    id: "haijiaoSavePageAs",
    title: "海角保存网页",
    contexts: ["page"]
  });
});

// 监听右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "haijiaoSavePageAs") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: downloadPage
    });
  }
});
/*-end-----------------右键菜单--------------------*/

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

// 下载页面
async function downloadPage() {
  const title = document.querySelector(".header .position-relative span").textContent;
  // 获取所有外部CSS样式内容
  const stylesheets = Array.from(document.styleSheets).filter(sheet => sheet.href);
  const cssPromises = stylesheets.map(sheet => fetch(sheet.href).then(res => res.text()));
  const cssContents = await Promise.all(cssPromises);

  // 获取所有内嵌CSS样式
  const inlineStyles = Array.from(document.querySelectorAll('style')).map(style => style.textContent);

  // 创建一个新的HTML文档并插入所有CSS样式
  const doc = document.implementation.createHTMLDocument(document.title);
  const base = doc.createElement('base');
  base.href = document.location.href;
  doc.head.appendChild(base);

  cssContents.forEach(css => {
    const style = doc.createElement('style');
    style.textContent = css;
    doc.head.appendChild(style);
  });

  inlineStyles.forEach(css => {
    const style = doc.createElement('style');
    style.textContent = css;
    doc.head.appendChild(style);
  });

  doc.body.innerHTML = document.body.innerHTML;

  // 创建Blob并下载文件
  const blob = new Blob([doc.documentElement.outerHTML], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = title + ".html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
/*-end-----------------下载相关--------------------*/