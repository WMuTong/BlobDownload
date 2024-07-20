/*-start------------Message相关------------------*/
const MessageObject = {
  'HAIJIAO': {
    m3u8s: [],
    todu: {
      // 获取 m3u8 内容，并下载
      'GETM3U8CONTENT': (data) => {
        // 通知 background 下载 m3u8 文件
        chrome.runtime.sendMessage({
          type: 'DOWNLOAD',
          data: [data.url, `${data.title}.m3u8`]
        });

        // 在线获取 m3u8 内容，为了下载 key
        fetch(data.url)
          .then(response => response.text())
          .then(_data => {
            const { uri, iv, ts, method } = extractKeyInfo(_data);

            // 通知 background 下载 key 文件
            chrome.runtime.sendMessage({
              type: 'DOWNLOAD',
              data: [uri, `${data.title}.key`]
            });
          })
          .catch(error => console.error('Error fetching response:', error));
      },
      // 向 popup 发送添加 url 消息
      'ADDM3U8URLTOPOPUP': (data) => {
        const dataUrlIdx = MessageObject['HAIJIAO'].m3u8s.findIndex(m => m.url === data.url);

        if (data.url && dataUrlIdx < 0) {
          const title = document.querySelector(".header .position-relative span").textContent;

          MessageObject['HAIJIAO'].m3u8s.push({
            url: data.url,
            title: sanitizeFilename(title)
          });
          chrome.runtime.sendMessage({
            type: 'POPUP_ADDM3U8',
            data: {
              m3u8s: MessageObject['HAIJIAO'].m3u8s,
              tabId: data.tabId
            }
          });
        }
      },
      // 给 popup 提供当前页面所有 m3u8 url
      'GETM3U8URLS': (data, sendResponse) => {
        sendResponse(MessageObject['HAIJIAO'].m3u8s);
      }
    }
  },
  'ONLYFANS': {
    mpds: [],
    isInjectedScripted: false,
    todu: {
      // 根据 mpd 下载
      'ADDMPDURLTOPOPUP': (data) => {
        const dataUrlIdx = MessageObject['ONLYFANS'].mpds.findIndex(m => m.url === data.url);

        if (data.url && dataUrlIdx < 0) {
          const title = document.querySelector("head title").textContent;

          MessageObject['ONLYFANS'].mpds.push({
            url: data.url,
            title: sanitizeFilename(title)
          });
          chrome.runtime.sendMessage({
            type: 'POPUP_ADDMMPD',
            data: {
              mpds: MessageObject['ONLYFANS'].mpds,
              tabId: data.tabId
            }
          });
        }
      },
      // 给 popup 提供当前页面所有 mpds url
      'GETMPDURLS': (data, sendResponse) => {
        sendResponse(MessageObject['ONLYFANS'].mpds);
      },
      'FETCHRANG': (data) => {
        window.postMessage({
          type: 'POPUP_DOWNMPD',
          params: { url: data.url, title: data.title }
        }, '*');
      }
    }
  }
};

// 接收消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type?.indexOf('_') > 0) {
    const [type, todu] = message.type.split('_');

    MessageObject[type]?.todu?.[todu]?.(
      JSON.parse(message.data),
      (...any) => sendResponse(...any)
    );
  }
});
/*-end------------Message相关------------------*/

/*-start-----------------Telegram私密群相关--------------------*/
const telegram = {
  config: {
    // 匹配规则
    match: {
      // 匹配规则
      hrefs: [
        {
          // 获取 m3u8 内容的接口
          rule: /^https:\/\/web\.telegram\.org\/.*$/,
          // 在 telegram.todo 中定义的对应处理方法
          todo: {
            'completed': 'mutationObserverVideo'
          }
        }
      ]
    }
  },
  /**
   * 检测网站地址符合的配置
   * @param {<string>} href '网站地址'
   * @param {'beforeRequest'|'completed'} type '响应位置'
   */
  detectionLoactionHref: (href, type) => {
    for (let i = 0; i < telegram.config.match.hrefs.length; i++) {
      const rule = telegram.config.match.hrefs[i];
      if (href?.match(rule.rule)) {
        telegram.todo?.[rule.todo?.[type]]?.(href);
        break;
      }
    }
  },
  todo: {
    // 监听视频标签
    mutationObserverVideo() {
      function injectedScript() {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('injected-script.js');
        (document.head || document.documentElement).appendChild(script);
        script.onload = function () {
          script.remove();
        };
      };
      // 添加css文件
      function addCSSFile() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = chrome.runtime.getURL('styles.css');
        document.head.appendChild(link);
      };
      // 在video添加下载按钮
      function addButtonToVideo(video) {
        if (!!video.src) {
          const span = document.createElement('span');
          span.textContent = "下载";
          span.classList.add('download_video');

          span.setAttribute('data-video-src', video.src);

          if (!video.parentNode.classList.contains('ckin__player')) {
            video.parentNode.style.position = 'relative';
          }
          video.parentNode.insertBefore(span, video.nextSibling);
        }
      };

      setTimeout(() => injectedScript(), 3000);
      addCSSFile();
      document.querySelectorAll('video').forEach(addButtonToVideo);

      const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node.tagName === 'VIDEO') {
                addButtonToVideo(node);
              }
              // else if (node.querySelectorAll) {
              //   node.querySelectorAll('video').forEach(addSpanToVideo);
              // }
            });
          }
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
};
/*-end-----------------Telegram私密群相关--------------------*/

/*-start-----------------OnlyFans相关--------------------*/
const onlyfans = {
  config: {
    // 匹配规则
    match: {
      // 匹配规则
      hrefs: [
        {
          // 获取 m3u8 内容的接口
          rule: /^https:\/\/onlyfans\.com\/.*$/,
          // 在 todo 中定义的对应处理方法
          todo: {
            'completed': 'injectedScript'
          }
        }
      ]
    }
  },
  /**
   * 检测网站地址符合的配置
   * @param {<string>} href '网站地址'
   * @param {'beforeRequest'|'completed'} type '响应位置'
   */
  detectionLoactionHref: (href, type) => {
    for (let i = 0; i < onlyfans.config.match.hrefs.length; i++) {
      const rule = onlyfans.config.match.hrefs[i];
      if (href?.match(rule.rule)) {
        onlyfans.todo?.[rule.todo?.[type]]?.(href);
        break;
      }
    }
  },
  todo: {
    // 注入js文件
    injectedScript() {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('injected-script-onlyfans.js');
      (document.head || document.documentElement).appendChild(script);
      script.onload = function () {
        script.remove();
      };
    }
  }
};
/*-end-----------------OnlyFans相关--------------------*/

/*-start------------Document 相关------------------*/
document.addEventListener('DOMContentLoaded', () => {
  // 尝试匹配 telegram 相关操作
  telegram.detectionLoactionHref(location.href, 'completed');
  // 尝试匹配 onlyfans 相关操作
  onlyfans.detectionLoactionHref(location.href, 'completed');
})
/*-end------------Document 相关------------------*/

/*-start------------工具------------------*/
// 提取 m3u8 中的信息
function extractKeyInfo(m3u8Content) {
  const uriRegex = /URI="([^"]+)"/;
  const ivRegex = /IV=([^,]+)/;
  const methodRegex = /METHOD=([^,]+)/;
  const tsRegex = /https:\/\/ts2\.hjbd81\.top\/hjstore\/video\/\d{8}\/[a-z0-9]+\/[a-z0-9_\-\.\?\&\=~]+/gi;

  const uriMatch = m3u8Content.match(uriRegex);
  const ivMatch = m3u8Content.match(ivRegex);
  const methodMatch = m3u8Content.match(methodRegex);
  const tsMatch = m3u8Content.match(tsRegex);

  const _iv = (ivMatch ? ivMatch[1].split('\n')?.[0] : null)?.split('0x');

  const uri = uriMatch ? uriMatch[1] : null;
  const iv = _iv ? _iv[_iv.length - 1] : '';
  const method = methodMatch ? methodMatch[1] : null;
  const ts = tsMatch ? tsMatch?.slice(1) : [];

  return { uri, iv, ts, method };
};
// 字符串转16进制
function strToHex(str) {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i).toString(16);
    hex += charCode.length === 1 ? '0' + charCode : charCode;
  }
  return hex;
}
// 移除文件名中的非法字符
function sanitizeFilename(filename) {
  // 定义不符合文件名规范的字符及其替换字符
  const invalidChars = /[\/\?<>\\:\*\|":]/g;
  // 使用下划线替换不符合文件名规范的字符
  let sanitized = filename.replace(invalidChars, '_');

  // 去除文件名前后的空格
  sanitized = sanitized.trim();

  // 去除文件名末尾的点
  sanitized = sanitized.replace(/\.+$/, '');

  // 限制文件名长度（假设最大长度为255字符）
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}
// 获取页面中所有资源链接
function getAllResources() {
  const urls = [];
  const elements = document.querySelectorAll('img, link[rel="stylesheet"], script[src]');

  elements.forEach(element => {
    if (element.tagName === 'IMG' && element.src) {
      urls.push(element.src);
    } else if (element.tagName === 'LINK' && element.href) {
      urls.push(element.href);
    } else if (element.tagName === 'SCRIPT' && element.src) {
      urls.push(element.src);
    }
  });

  urls.push(window.location.href); // add the current page itself

  return urls;
}
/*-end------------工具------------------*/
