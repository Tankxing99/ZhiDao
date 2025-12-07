/**
 * 创建简化的图片显示测试
 * 直接在推荐结果页面硬编码显示雪铁芋图片
 */

const fs = require('fs');
const path = require('path');

// 创建简化的测试版本
function createSimpleTest() {
  console.log('=== 创建简化图片显示测试 ===\n');
  
  // 备份原始文件
  const resultJsPath = path.join(__dirname, '../pages/result/index.js');
  const backupPath = `${resultJsPath}.backup.${Date.now()}`;
  fs.copyFileSync(resultJsPath, backupPath);
  console.log(`原始文件已备份到: ${backupPath}`);
  
  // 读取原始文件
  let content = fs.readFileSync(resultJsPath, 'utf8');
  
  // 在 setData 之前添加硬编码的图片数据
  const testCode = `
    // === 临时测试代码：硬编码雪铁芋图片 ===
    limitedList.forEach((item, index) => {
      if (item.name === '雪铁芋' || item.id === 'zamioculcas_zamiifolia') {
        console.log('找到雪铁芋，添加图片数据');
        item._displayImage = {
          url: '/images/plantnet/zamioculcas_zamiifolia/zamioculcas_zamiifolia_11.jpg',
          source: 'PlantNet',
          type: 'habit',
          hasMultiple: true
        };
        console.log('雪铁芋图片数据:', item._displayImage);
      } else {
        // 其他植物使用占位图片
        item._displayImage = {
          url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIGZpbGw9IiNGNUY1RjciLz4KICA8IS0tIOiKseeUsyAtLT4KICA8cGF0aCBkPSJNMzIgNzJINjRMNjAgNTZIMzZMMzIgNzJaIiBmaWxsPSIjOEU4RTkzIiBvcGFjaXR5PSIwLjMiLz4KICA8IS0tIOakreeJqeiMjuW5siAtLT4KICA8cGF0aCBkPSJNNDggNTZWNDAiIHN0cm9rZT0iIzM0Qzc1OSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8IS0tIOWPtuWtkCAtLT4KICA8cGF0aCBkPSJNNDggNDVDNTIgNDEgNTggNDMgNTYgNDhDNTggNTMgNTIgNTUgNDggNTEiIGZpbGw9IiMzNEM3NTkiIG9wYWNpdHk9IjAuNiIvPgogIDxwYXRoIGQ9Ik00OCA0NUM0NCA0MSAzOCA0MyA0MCA0OEMzOCA1MyA0NCA1NSA0OCA1MSIgZmlsbD0iIzM0Qzc1OSIgb3BhY2l0eT0iMC42Ii8+CiAgPCEtLSDoi7HmnLUgLS0+CiAgPGNpcmNsZSBjeD0iNDgiIGN5PSIzNSIgcj0iNSIgZmlsbD0iI0ZGOTUwMCIgb3BhY2l0eT0iMC43Ii8+CiAgPGNpcmNsZSBjeD0iNDUiIGN5PSIzMiIgcj0iMiIgZmlsbD0iI0ZGRDYwQSIvPgogIDxjaXJjbGUgY3g9IjUxIiBjeT0iMzIiIHI9IjIiIGZpbGw9IiNGRkQ2MEEiLz4KICA8Y2lyY2xlIGN4PSI0OCIgY3k9IjM4IiByPSIyIiBmaWxsPSIjRkZENjBBIi8+Cjwvc3ZnPg==',
          source: 'placeholder',
          type: 'placeholder',
          hasMultiple: false
        };
      }
    });
    // === 测试代码结束 ===
    `;
  
  // 在 this.setData({ list: limitedList }); 之前插入测试代码
  content = content.replace(
    'this.setData({ list: limitedList });',
    testCode + '\n    this.setData({ list: limitedList });'
  );
  
  // 保存修改后的文件
  fs.writeFileSync(resultJsPath, content, 'utf8');
  console.log('✅ 简化测试代码已添加到 pages/result/index.js');
  
  console.log('\n现在请：');
  console.log('1. 重新编译小程序');
  console.log('2. 进入推荐结果页面');
  console.log('3. 查看雪铁芋是否显示图片和标识');
  console.log('4. 检查开发者工具控制台的调试输出');
  
  return true;
}

// 恢复原始文件
function restoreOriginal() {
  console.log('=== 恢复原始文件 ===');
  
  const resultJsPath = path.join(__dirname, '../pages/result/index.js');
  const backupFiles = fs.readdirSync(path.dirname(resultJsPath))
    .filter(file => file.startsWith('index.js.backup.'))
    .sort()
    .reverse();
  
  if (backupFiles.length === 0) {
    console.log('❌ 未找到备份文件');
    return false;
  }
  
  const latestBackup = path.join(path.dirname(resultJsPath), backupFiles[0]);
  fs.copyFileSync(latestBackup, resultJsPath);
  console.log(`✅ 已从备份恢复: ${latestBackup}`);
  
  return true;
}

// 检查图片是否可以通过HTTP访问
function checkHttpAccess() {
  console.log('=== 检查图片HTTP访问 ===');
  
  const imagePath = '/images/plantnet/zamioculcas_zamiifolia/zamioculcas_zamiifolia_11.jpg';
  const localPath = path.join(__dirname, '..', imagePath);
  
  if (fs.existsSync(localPath)) {
    console.log('✅ 本地文件存在');
    
    // 检查是否在小程序的静态资源目录中
    const projectRoot = path.join(__dirname, '..');
    const relativePath = path.relative(projectRoot, localPath);
    console.log(`相对路径: ${relativePath}`);
    
    // 建议的解决方案
    console.log('\n可能的问题和解决方案:');
    console.log('1. 小程序可能无法访问 /images/ 路径');
    console.log('2. 需要将图片放在小程序的静态资源目录中');
    console.log('3. 或者上传到云存储并使用HTTPS URL');
    
    return true;
  } else {
    console.log('❌ 本地文件不存在');
    return false;
  }
}

// 创建云存储上传建议
function createCloudUploadSuggestion() {
  console.log('\n=== 云存储上传建议 ===');
  
  const suggestion = `
建议将图片上传到抖音云存储：

1. 在抖音开发者工具中：
   - 打开云开发控制台
   - 进入存储管理
   - 创建 plants 文件夹
   - 上传 zamioculcas_zamiifolia_11.jpg

2. 获取云存储URL后，更新植物数据库：
   - 将本地路径替换为云存储URL
   - 格式类似：https://your-cloud-storage.com/plants/zamioculcas_zamiifolia_11.jpg

3. 或者使用我们的上传脚本：
   node scripts/upload_images_to_cloud.js
`;

  console.log(suggestion);
  
  const suggestionPath = path.join(__dirname, 'cloud_upload_suggestion.txt');
  fs.writeFileSync(suggestionPath, suggestion, 'utf8');
  console.log(`建议已保存到: ${suggestionPath}`);
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'test';
  
  switch (action) {
    case 'test':
      createSimpleTest();
      checkHttpAccess();
      createCloudUploadSuggestion();
      break;
    case 'restore':
      restoreOriginal();
      break;
    case 'check':
      checkHttpAccess();
      break;
    default:
      console.log('使用方法:');
      console.log('  node create_simple_test.js test    - 创建简化测试');
      console.log('  node create_simple_test.js restore - 恢复原始文件');
      console.log('  node create_simple_test.js check   - 检查图片访问');
      break;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  createSimpleTest,
  restoreOriginal,
  checkHttpAccess,
  createCloudUploadSuggestion
};
