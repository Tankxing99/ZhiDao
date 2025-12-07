/**
 * 植物数据导入脚本
 * 将enhanced_plants.json中的植物数据导入到抖音云数据库
 */

const fs = require('fs');
const path = require('path');

// 模拟抖音云SDK初始化
// 在实际环境中，这将由抖音云平台自动提供
const dySDK = {
  database: () => ({
    collection: (name) => ({
      add: async (data) => {
        console.log(`[模拟] 向集合 ${name} 添加数据:`, {
          id: data.id,
          name: data.name,
          tags: data.tags?.slice(0, 3) + '...',
          onShelf: data.onShelf
        });
        return { 
          _id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          success: true 
        };
      },
      where: (query) => ({
        get: async () => {
          console.log(`[模拟] 查询集合 ${name}:`, query);
          return { data: [] };
        }
      }),
      doc: (id) => ({
        update: async (data) => {
          console.log(`[模拟] 更新文档 ${id} 在集合 ${name}:`, {
            name: data.name,
            onShelf: data.onShelf
          });
          return { success: true };
        }
      })
    })
  })
};

async function importPlants() {
  try {
    console.log('🌱 开始导入植物数据到抖音云数据库...\n');
    
    // 读取植物数据
    const plantsPath = path.join(__dirname, '../data/enhanced_plants.json');
    const plantsData = JSON.parse(fs.readFileSync(plantsPath, 'utf8'));
    
    console.log(`📊 共找到 ${plantsData.length} 个植物数据\n`);
    
    // 初始化数据库
    const db = dySDK.database();
    const plantsCollection = db.collection('plants');
    
    // 检查现有数据
    console.log('🔍 检查现有植物数据...');
    const existingPlants = await plantsCollection.where({}).get();
    console.log(`现有植物数量: ${existingPlants.data.length}\n`);
    
    // 导入植物数据
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < plantsData.length; i++) {
      const plant = plantsData[i];
      
      try {
        // 转换数据格式以适配数据库
        const plantDoc = {
          id: plant.id,
          name: plant.name,
          scientific_name: plant.scientific_name,
          common_names: plant.common_names,
          characteristics: plant.characteristics,
          environment: plant.environment,
          care: plant.care,
          toxicity: plant.toxicity,
          questionnaire_tags: plant.questionnaire_tags,
          tags: plant.tags,
          safetyFlags: plant.safetyFlags,
          onShelf: plant.onShelf,
          cover: plant.cover,
          updatedAt: plant.updatedAt || Date.now(),
          score: plant.score || 0,
          createdAt: Date.now()
        };
        
        // 添加到数据库
        const result = await plantsCollection.add(plantDoc);
        
        if (result.success) {
          successCount++;
          console.log(`✅ [${i + 1}/${plantsData.length}] 成功导入: ${plant.name} (${plant.id})`);
        } else {
          errorCount++;
          console.log(`❌ [${i + 1}/${plantsData.length}] 导入失败: ${plant.name} (${plant.id})`);
        }
        
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errorCount++;
        console.log(`❌ [${i + 1}/${plantsData.length}] 导入出错: ${plant.name} (${plant.id}) - ${error.message}`);
      }
    }
    
    console.log('\n📈 导入结果统计:');
    console.log(`✅ 成功导入: ${successCount} 个植物`);
    console.log(`❌ 导入失败: ${errorCount} 个植物`);
    console.log(`📊 总计处理: ${plantsData.length} 个植物`);
    
    if (successCount === plantsData.length) {
      console.log('\n🎉 所有植物数据导入成功！');
    } else {
      console.log('\n⚠️  部分植物数据导入失败，请检查错误信息');
    }
    
  } catch (error) {
    console.error('💥 导入过程中发生错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  importPlants().then(() => {
    console.log('\n🏁 植物数据导入脚本执行完成');
    process.exit(0);
  }).catch(error => {
    console.error('💥 脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { importPlants };
