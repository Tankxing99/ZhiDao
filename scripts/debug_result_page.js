/**
 * 调试推荐结果页面的数据和图片显示
 */

const fs = require('fs');
const path = require('path');

// 读取植物数据库
function loadPlantDatabase() {
  const dbPath = path.join(__dirname, '../plant_knowledge_database.json');
  const data = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(data);
}

// 模拟推荐结果页面的逻辑
function simulateResultPage() {
  console.log('=== 推荐结果页面数据调试 ===\n');
  
  const db = loadPlantDatabase();
  
  // 模拟推荐列表（前5个植物）
  const mockList = db.plants.slice(0, 5);
  
  console.log('模拟推荐列表:');
  mockList.forEach((plant, index) => {
    console.log(`${index + 1}. ${plant.common_names.zh[0]} (${plant.id})`);
  });
  
  // 模拟 getPlantDisplayImage 逻辑
  function getPlantDisplayImage(plant) {
    console.log(`\n--- 处理植物: ${plant.common_names.zh[0]} ---`);
    console.log(`植物ID: ${plant.id}`);
    console.log(`有images字段: ${plant.images ? '是' : '否'}`);
    
    if (plant.images) {
      console.log(`图片来源: ${plant.images.source}`);
      console.log(`图片数量: ${plant.images.files ? plant.images.files.length : 0}`);
    }
    
    // 优先使用PlantNet图片
    if (plant.images && plant.images.source === 'PlantNet' && plant.images.files && plant.images.files.length > 0) {
      console.log('✅ 符合PlantNet图片条件');
      
      // 优先选择整株图片，其次是叶片图片
      const habitImages = plant.images.files.filter(img => img.type === 'habit');
      const leafImages = plant.images.files.filter(img => img.type === 'leaf');
      
      console.log(`整株图片数量: ${habitImages.length}`);
      console.log(`叶片图片数量: ${leafImages.length}`);
      
      let selectedImage;
      if (habitImages.length > 0) {
        selectedImage = habitImages[0];
        console.log('选择整株图片');
      } else if (leafImages.length > 0) {
        selectedImage = leafImages[0];
        console.log('选择叶片图片');
      } else {
        selectedImage = plant.images.files[0];
        console.log('选择第一张图片');
      }
      
      console.log(`选中图片: ${selectedImage.filename}`);
      console.log(`图片URL: ${selectedImage.url}`);
      
      // 检查本地文件是否存在
      const localPath = path.join(__dirname, '..', selectedImage.url);
      const exists = fs.existsSync(localPath);
      console.log(`本地文件存在: ${exists ? '是' : '否'}`);
      
      if (exists) {
        const stats = fs.statSync(localPath);
        console.log(`文件大小: ${(stats.size / 1024).toFixed(1)} KB`);
      }
      
      return {
        url: selectedImage.url,
        source: 'PlantNet',
        type: selectedImage.type,
        hasMultiple: plant.images.files.length > 1
      };
    }
    
    // 降级到原始cover图片
    if (plant.cover) {
      console.log('使用原始cover图片');
      return {
        url: plant.cover,
        source: 'original',
        type: 'cover',
        hasMultiple: false
      };
    }
    
    // 默认占位图片
    console.log('使用占位图片');
    return {
      url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIGZpbGw9IiNGNUY1RjciLz4KICA8IS0tIOiKseeUsyAtLT4KICA8cGF0aCBkPSJNMzIgNzJINjRMNjAgNTZIMzZMMzIgNzJaIiBmaWxsPSIjOEU4RTkzIiBvcGFjaXR5PSIwLjMiLz4KICA8IS0tIOakreeJqeiMjuW5siAtLT4KICA8cGF0aCBkPSJNNDggNTZWNDAiIHN0cm9rZT0iIzM0Qzc1OSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8IS0tIOWPtuWtkCAtLT4KICA8cGF0aCBkPSJNNDggNDVDNTIgNDEgNTggNDMgNTYgNDhDNTggNTMgNTIgNTUgNDggNTEiIGZpbGw9IiMzNEM3NTkiIG9wYWNpdHk9IjAuNiIvPgogIDxwYXRoIGQ9Ik00OCA0NUM0NCA0MSAzOCA0MyA0MCA0OEMzOCA1MyA0NCA1NSA0OCA1MSIgZmlsbD0iIzM0Qzc1OSIgb3BhY2l0eT0iMC42Ii8+CiAgPCEtLSDoi7HmnLUgLS0+CiAgPGNpcmNsZSBjeD0iNDgiIGN5PSIzNSIgcj0iNSIgZmlsbD0iI0ZGOTUwMCIgb3BhY2l0eT0iMC43Ii8+CiAgPGNpcmNsZSBjeD0iNDUiIGN5PSIzMiIgcj0iMiIgZmlsbD0iI0ZGRDYwQSIvPgogIDxjaXJjbGUgY3g9IjUxIiBjeT0iMzIiIHI9IjIiIGZpbGw9IiNGRkQ2MEEiLz4KICA8Y2lyY2xlIGN4PSI0OCIgY3k9IjM4IiByPSIyIiBmaWxsPSIjRkZENjBBIi8+Cjwvc3ZnPg==',
      source: 'placeholder',
      type: 'placeholder',
      hasMultiple: false
    };
  }
  
  // 处理每个植物
  console.log('\n=== 处理每个植物的图片信息 ===');
  const processedList = mockList.map(plant => {
    const _displayImage = getPlantDisplayImage(plant);
    return {
      ...plant,
      _displayImage
    };
  });
  
  // 生成调试报告
  console.log('\n=== 最终数据结构 ===');
  processedList.forEach((plant, index) => {
    console.log(`\n${index + 1}. ${plant.common_names.zh[0]}`);
    console.log(`   _displayImage.source: ${plant._displayImage.source}`);
    console.log(`   _displayImage.type: ${plant._displayImage.type}`);
    console.log(`   _displayImage.hasMultiple: ${plant._displayImage.hasMultiple}`);
    console.log(`   _displayImage.url: ${plant._displayImage.url.substring(0, 60)}...`);
  });
  
  // 保存调试数据
  const debugData = {
    timestamp: new Date().toISOString(),
    processedList: processedList.map(plant => ({
      id: plant.id,
      name: plant.common_names.zh[0],
      _displayImage: plant._displayImage
    }))
  };
  
  const debugPath = path.join(__dirname, 'result_page_debug.json');
  fs.writeFileSync(debugPath, JSON.stringify(debugData, null, 2), 'utf8');
  console.log(`\n调试数据已保存到: ${debugPath}`);
  
  return processedList;
}

// 检查小程序是否能访问图片
function checkImageAccess() {
  console.log('\n=== 检查图片访问性 ===');
  
  const imagePath = '/images/plantnet/zamioculcas_zamiifolia/zamioculcas_zamiifolia_11.jpg';
  const localPath = path.join(__dirname, '..', imagePath);
  
  console.log(`检查图片: ${imagePath}`);
  console.log(`本地路径: ${localPath}`);
  
  if (fs.existsSync(localPath)) {
    const stats = fs.statSync(localPath);
    console.log(`✅ 文件存在，大小: ${(stats.size / 1024).toFixed(1)} KB`);
    
    // 检查小程序项目结构
    const projectImagePath = path.join(__dirname, '../images');
    if (fs.existsSync(projectImagePath)) {
      console.log('✅ 项目images目录存在');
    } else {
      console.log('❌ 项目images目录不存在');
    }
  } else {
    console.log('❌ 文件不存在');
  }
}

// 生成小程序调试代码
function generateDebugCode() {
  console.log('\n=== 生成小程序调试代码 ===');
  
  const debugCode = `
// 在 pages/result/index.js 的 onShow 方法中添加以下调试代码：

console.log('=== 推荐结果页面调试 ===');
console.log('原始list:', list);

const enhanced = (list || []).map((item, index)=>{
  console.log(\`处理植物 \${index + 1}: \${item.name}\`);
  console.log('植物数据:', item);
  
  if(!answers){ return item; }
  try{
    let enhancedItem = { ...item };
    
    // ... 现有推荐理由逻辑 ...
    
    // 添加PlantNet图片信息
    enhancedItem._displayImage = this.getPlantDisplayImage(item);
    console.log(\`\${item.name} 的 _displayImage:\`, enhancedItem._displayImage);
    
    return enhancedItem;
  }catch(error){
    console.error(\`处理植物 \${item.name} 时出错:\`, error);
    return item;
  }
});

console.log('处理后的enhanced:', enhanced);

// 限制显示最多5个推荐结果
const limitedList = enhanced.slice(0, 5);
console.log('最终limitedList:', limitedList);

this.setData({ list: limitedList });
`;

  const debugCodePath = path.join(__dirname, 'miniprogram_debug_code.js');
  fs.writeFileSync(debugCodePath, debugCode, 'utf8');
  console.log(`调试代码已生成: ${debugCodePath}`);
}

// 主函数
function main() {
  simulateResultPage();
  checkImageAccess();
  generateDebugCode();
  
  console.log('\n=== 建议的解决步骤 ===');
  console.log('1. 检查小程序开发者工具的控制台输出');
  console.log('2. 确认图片文件路径是否正确');
  console.log('3. 重新编译小程序项目');
  console.log('4. 检查网络请求是否成功');
  console.log('5. 添加调试代码查看数据流');
}

if (require.main === module) {
  main();
}

module.exports = {
  simulateResultPage,
  checkImageAccess,
  generateDebugCode
};
