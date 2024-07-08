const MessageObject = {
  'POPUP': {
    todu: {
      // 向 popup list 中插入 url 列表
      'ADDM3U8': (data) => {
        data?.m3u8s?.map(m3u8 => {
          $('#list').append(`<div class="item" data-url="${m3u8.url}" data-ms-type="HAIJIAO_GETM3U8CONTENT" data-title="${m3u8.title}">${m3u8.title}</div>`);
        })
      },
      'ADDMMPD': (data) => {
        data?.mpds?.map(mpd => {
          $('#list').append(`<div class="item" data-url="${mpd.url}"  data-ms-type="ONLYFANS_FETCHRANG" data-title="${mpd.title}">${mpd.title}</div>`);
        })
      }
    }
  },
};

// 接受消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type?.indexOf('_') > 0) {
    const [type, todu] = message.type.split('_');

    MessageObject[type]?.todu?.[todu]?.(JSON.parse(message.data));
    sendResponse('popup已收到消息');
  }
});

$(function () {
  // 向所有选中的页面发送消息，获取 url 集合
  chrome.tabs.query(
    { active: true },
    tabs => {
      tabs?.map(tab => {
        chrome.tabs.sendMessage(
          tab.id,
          {
            type: "HAIJIAO_GETM3U8URLS",
            data: JSON.stringify({})
          },
          m3u8s => {
            MessageObject["POPUP"].todu["ADDM3U8"]({ m3u8s });
          }
        );
        chrome.tabs.sendMessage(
          tab.id,
          {
            type: "ONLYFANS_GETMPDURLS",
            data: JSON.stringify({})
          },
          mpds => {
            MessageObject["POPUP"].todu["ADDMMPD"]({ mpds });
          }
        )
      })
    }
  );

  // 绑定事件, 点击视频名称下载m3u8 及 html 页面
  $("#list").off("click", "div.item").on("click", "div.item", function (e) {
    const url = $(this).data("url");
    const title = $(this).data("title");
    const msType = $(this).data("ms-type");

    chrome.tabs.query(
      { active: true },
      tabs => {
        console.log(msType, tabs);
        tabs?.map(tab => {
          chrome.tabs.sendMessage(
            tab.id,
            {
              type: msType,
              data: JSON.stringify({url, title, id: tab.id})
            }
          )
        })
      }
    );
  })
});