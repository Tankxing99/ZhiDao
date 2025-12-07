
// 在 pages/result/index.js 的 onShow 方法中添加以下调试代码：

console.log('=== 推荐结果页面调试 ===');
console.log('原始list:', list);

const enhanced = (list || []).map((item, index)=>{
  console.log(`处理植物 ${index + 1}: ${item.name}`);
  console.log('植物数据:', item);
  
  if(!answers){ return item; }
  try{
    let enhancedItem = { ...item };
    
    // ... 现有推荐理由逻辑 ...
    
    // 添加PlantNet图片信息
    enhancedItem._displayImage = this.getPlantDisplayImage(item);
    console.log(`${item.name} 的 _displayImage:`, enhancedItem._displayImage);
    
    return enhancedItem;
  }catch(error){
    console.error(`处理植物 ${item.name} 时出错:`, error);
    return item;
  }
});

console.log('处理后的enhanced:', enhanced);

// 限制显示最多5个推荐结果
const limitedList = enhanced.slice(0, 5);
console.log('最终limitedList:', limitedList);

this.setData({ list: limitedList });
