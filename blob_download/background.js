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

/*-start-----------------Telegram私密群相关--------------------*/
const telegram = {
  config: {},
  detectionFetchUrl: () => { },
  // 执行
  todo: {
    'fetchMp4': (tabId, url) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['inject.js']
      });
return;

      url = 'https://web.telegram.org/k/stream/%7B%22dcId%22%3A5%2C%22location%22%3A%7B%22_%22%3A%22inputDocumentFileLocation%22%2C%22id%22%3A%226071294919845089031%22%2C%22access_hash%22%3A%22-7985772992753784704%22%2C%22file_reference%22%3A%5B4%2C109%2C190%2C246%2C215%2C0%2C0%2C0%2C64%2C102%2C135%2C151%2C136%2C44%2C171%2C34%2C183%2C33%2C255%2C244%2C199%2C49%2C235%2C166%2C231%2C204%2C239%2C237%2C71%5D%7D%2C%22size%22%3A3735547%2C%22mimeType%22%3A%22video%2Fmp4%22%2C%22fileName%22%3A%22video.mp4%22%7D';
      fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'include'
      })
        .then(response => response.blob())
        .then(blob => {
          // downloadFile(URL.createObjectURL(blob), 'video.mp4');
          const reader = new FileReader();
          reader.onload = function () {
            const dataUrl = reader.result;
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              func: (dataUrl, filename) => {
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = filename;
                link.click();
              },
              args: [dataUrl, 'video.mp4']
            });
          };
          reader.readAsDataURL(blob);
        })
        .catch(error => {
          console.log({ status: 'error', error: error });
        });
    }
  }
}
/*-end-----------------Telegram私密群相关--------------------*/

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
  switch (message.type) {
    case 'DOWNLOAD':
      haijiao.todo["downloadM3u8"](...message.data);
      break;
    case 'FETCH_MP4':
      telegram.todo["fetchMp4"](sender.tab.id, ...message.data);
      break;
    default:
      sendResponse(`background已收到消息: ${message.type} - ${JSON.stringify(message.data)}`)
      break;
  }
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