// options.js

let colorBtns = document.getElementById("colorBtns"); // 按钮实例
let currentClassName = 'current'; // 当前选择的颜色

const colorList = ["#3aa757", "#e8453c", "#f9bb2d", "#4688f1"];

/**
 * 设置颜色按钮
 * 
 * @param {Array} colorList 颜色列表
 * 
*/
function setColorBtns(colorList) {
  
  // 获取当前存储的颜色
  chrome.storage.sync.get('color', (data) => {

    let currentColor = data.color; // 当前已选中的颜色
    
    // 遍历颜色列表并创建按钮
    colorList.map((item) => {
      let button = document.createElement('button'); // 创建按钮
      button.dataset.color = item; // 为每个按钮设置颜色变量, 存储在dataset中, 为点击事件作参数准备
      button.style.backgroundColor = item; // 设置按钮颜色样式
      button.classList.add('color-btn'); // 设置按钮样式 - popup.css

      // 设置当前已选中的按钮
      if (currentColor === item) {
        button.classList.add(currentClassName);
      };

      // 对按钮绑定点击事件
      button.addEventListener('click', handleButtonClick);

      // 将按钮写入页面
      colorBtns.appendChild(button);

    });

  });

};

/**
 * 按钮点击事件
 * 
 * @param {Object} event 按钮本身
 * 
*/
function handleButtonClick(event) {
  
  // 删除其他按钮的选中样式
  let current = event.target.parentElement.querySelector(`.${currentClassName}`); // 从上一级dom结构里获取当前已选中的按钮
  if (current && current !== event.target) {
    // 删除按钮的选中样式
    current.classList.remove(currentClassName);
  };

  // 给当前按钮增加选中样式
  event.target.classList.add(currentClassName);
  
  // 修改当前chrome插件中存储的颜色
  let color = event.target.dataset.color; // 获取按钮中的dataset参数
  chrome.storage.sync.set({ color });
};

// 执行
// 批量添加按钮
setColorBtns(colorList);