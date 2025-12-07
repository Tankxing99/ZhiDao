const { getRecommendationReason } = require('../../utils/recommend');

Page({
  data:{
    list:[],
    algorithm: 'legacy', // 'legacy' | 'enhanced'
    userProfile: {},
    showDetailedReasons: false
  },
  onShow(){
    const app = getApp();
    const list = app.globalData?.tempRecommend || [];
    const answers = app.globalData?.tempAnswers || null;
    const algorithm = app.globalData?.recommendAlgorithm || 'legacy';
    const userProfile = app.globalData?.userProfile || {};

    this.setData({
      algorithm,
      userProfile,
      showDetailedReasons: algorithm === 'enhanced'
    });

    const enhanced = (list || []).map((item)=>{
      if(!answers){ return item; }
      try{
        let enhancedItem = { ...item };

        if (algorithm === 'enhanced') {
          // 使用增强版推荐理由生成
          const reason = this.generateEnhancedReason(answers, item, userProfile);
          enhancedItem._reason = reason;
          enhancedItem._reasonText = reason.text;
        } else {
          // 使用原始推荐理由（隐藏评分）
          const r = getRecommendationReason(answers, item) || {};
          const exact = (r.exactMatches||[]).join('、') || '无';
          const compat = (r.compatibleMatches||[]).join('、') || '无';
          const reasonText = `契合:${exact}  兼容:${compat}`;
          enhancedItem._reason = r;
          enhancedItem._reasonText = reasonText;
        }

        // 添加PlantNet图片信息
        enhancedItem._displayImage = this.getPlantDisplayImage(item);

        return enhancedItem;
      }catch(_){
        return item;
      }
    });

    // 限制显示最多5个推荐结果，按评分降序排列
    const limitedList = enhanced.slice(0, 5);

    // 调试输出
    console.log('=== 推荐结果页面调试 ===');
    console.log('处理后的推荐列表:', limitedList);
    limitedList.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}:`);
      console.log('  _displayImage:', item._displayImage);
      if (item._displayImage && item._displayImage.source === 'PlantNet') {
        console.log('  ✅ 应该显示PlantNet图片和标识');
      }
    });

    
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
    
    this.setData({ list: limitedList });
  },

  // 获取植物显示图片
  getPlantDisplayImage(plant) {
    // 优先使用PlantNet图片
    if (plant.images && plant.images.source === 'PlantNet' && plant.images.files && plant.images.files.length > 0) {
      // 优先选择整株图片，其次是叶片图片
      const habitImages = plant.images.files.filter(img => img.type === 'habit');
      const leafImages = plant.images.files.filter(img => img.type === 'leaf');

      if (habitImages.length > 0) {
        return {
          url: habitImages[0].url,
          source: 'PlantNet',
          type: 'habit',
          hasMultiple: plant.images.files.length > 1
        };
      } else if (leafImages.length > 0) {
        return {
          url: leafImages[0].url,
          source: 'PlantNet',
          type: 'leaf',
          hasMultiple: plant.images.files.length > 1
        };
      } else {
        return {
          url: plant.images.files[0].url,
          source: 'PlantNet',
          type: plant.images.files[0].type,
          hasMultiple: plant.images.files.length > 1
        };
      }
    }

    // 降级到原始cover图片
    if (plant.cover) {
      return {
        url: plant.cover,
        source: 'original',
        type: 'cover',
        hasMultiple: false
      };
    }

    // 默认占位图片（使用base64编码的SVG）
    return {
      url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIGZpbGw9IiNGNUY1RjciLz4KICA8IS0tIOiKseeUsyAtLT4KICA8cGF0aCBkPSJNMzIgNzJINjRMNjAgNTZIMzZMMzIgNzJaIiBmaWxsPSIjOEU4RTkzIiBvcGFjaXR5PSIwLjMiLz4KICA8IS0tIOakreeJqeiMjuW5siAtLT4KICA8cGF0aCBkPSJNNDggNTZWNDAiIHN0cm9rZT0iIzM0Qzc1OSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8IS0tIOWPtuWtkCAtLT4KICA8cGF0aCBkPSJNNDggNDVDNTIgNDEgNTggNDMgNTYgNDhDNTggNTMgNTIgNTUgNDggNTEiIGZpbGw9IiMzNEM3NTkiIG9wYWNpdHk9IjAuNiIvPgogIDxwYXRoIGQ9Ik00OCA0NUM0NCA0MSAzOCA0MyA0MCA0OEMzOCA1MyA0NCA1NSA0OCA1MSIgZmlsbD0iIzM0Qzc1OSIgb3BhY2l0eT0iMC42Ii8+CiAgPCEtLSDoi7HmnLUgLS0+CiAgPGNpcmNsZSBjeD0iNDgiIGN5PSIzNSIgcj0iNSIgZmlsbD0iI0ZGOTUwMCIgb3BhY2l0eT0iMC43Ii8+CiAgPGNpcmNsZSBjeD0iNDUiIGN5PSIzMiIgcj0iMiIgZmlsbD0iI0ZGRDYwQSIvPgogIDxjaXJjbGUgY3g9IjUxIiBjeT0iMzIiIHI9IjIiIGZpbGw9IiNGRkQ2MEEiLz4KICA8Y2lyY2xlIGN4PSI0OCIgY3k9IjM4IiByPSIyIiBmaWxsPSIjRkZENjBBIi8+Cjwvc3ZnPg==',
      source: 'placeholder',
      type: 'placeholder',
      hasMultiple: false
    };
  },

  // 生成增强版推荐理由
  generateEnhancedReason(answers, plant, userProfile) {
    const answersMap = {};
    answers.forEach(answer => {
      answersMap[answer.id] = answer.value;
    });

    const plantTags = plant.tags || [];
    const matches = {
      environment: [],
      aesthetic: [],
      care: [],
      safety: []
    };

    // 环境匹配分析
    if (this.isMatch(answersMap.lightCondition || answersMap.light, plantTags, 'light')) {
      matches.environment.push('光照条件');
    }
    if (this.isMatch(answersMap.spaceType || answersMap.space, plantTags, 'space')) {
      matches.environment.push('空间需求');
    }

    // 养护匹配分析
    if (this.isMatch(answersMap.experienceLevel || answersMap.level, plantTags, 'level')) {
      matches.care.push('经验水平');
    }
    if (answersMap.timeCommitment && this.isMatchTimeCommitment(answersMap.timeCommitment, plantTags)) {
      matches.care.push('时间投入');
    }

    // 审美匹配分析
    if (answersMap.plantShape && this.isMatchShape(answersMap.plantShape, plantTags)) {
      matches.aesthetic.push('植物形态');
    }
    if (answersMap.colorPreference && this.isMatchColor(answersMap.colorPreference, plantTags)) {
      matches.aesthetic.push('色彩偏好');
    }

    // 安全匹配分析
    const safetyFlags = plant.safetyFlags || [];
    let safetyScore = 100;
    const safetyIssues = [];

    if (userProfile.hasPets && safetyFlags.includes('pet_unsafe')) {
      safetyScore = 0;
      safetyIssues.push('对宠物有毒');
    }
    if (userProfile.hasChildren && safetyFlags.includes('child_unsafe')) {
      safetyScore = 0;
      safetyIssues.push('对儿童不安全');
    }

    if (safetyScore > 0) {
      matches.safety.push('安全无忧');
    }

    // 生成推荐理由文本
    const matchTexts = [];
    if (matches.environment.length > 0) {
      matchTexts.push(`环境适配：${matches.environment.join('、')}`);
    }
    if (matches.care.length > 0) {
      matchTexts.push(`养护匹配：${matches.care.join('、')}`);
    }
    if (matches.aesthetic.length > 0) {
      matchTexts.push(`审美符合：${matches.aesthetic.join('、')}`);
    }
    if (matches.safety.length > 0) {
      matchTexts.push(`安全可靠：${matches.safety.join('、')}`);
    }

    // 添加安全警告
    if (safetyIssues.length > 0) {
      matchTexts.push(`⚠️ 注意：${safetyIssues.join('、')}`);
    }

    // 隐藏匹配度百分比，只显示推荐理由
    const text = matchTexts.length > 0 ?
      `${matchTexts.join('；')}` :
      `基本符合您的需求`;

    return {
      text,
      matches,
      safetyScore,
      safetyIssues,
      matchPercentage,
      score: plant.score || 0
    };
  },

  // 计算匹配百分比
  calculateMatchPercentage(matches, safetyScore) {
    let totalMatches = 0;
    let maxPossible = 0;

    Object.values(matches).forEach(categoryMatches => {
      totalMatches += categoryMatches.length;
      maxPossible += 2; // 假设每个类别最多2个匹配项
    });

    const basePercentage = maxPossible > 0 ? (totalMatches / maxPossible) * 80 : 0;
    const safetyBonus = safetyScore > 0 ? 20 : 0;

    return Math.min(100, Math.round(basePercentage + safetyBonus));
  },

  // 匹配判断辅助方法
  isMatch(userValue, plantTags, dimension) {
    if (!userValue || !Array.isArray(plantTags)) return false;
    if (plantTags.includes(userValue)) return true;

    // 兼容性匹配
    const compatibilityRules = {
      light: {
        'low': ['medium'],
        'medium': ['low', 'high'],
        'high': ['medium']
      },
      space: {
        'large': ['medium', 'small'],
        'medium': ['small'],
        'small': []
      },
      level: {
        'expert': ['intermediate', 'beginner'],
        'intermediate': ['beginner'],
        'beginner': []
      }
    };

    const rules = compatibilityRules[dimension];
    if (rules && rules[userValue]) {
      return rules[userValue].some(compatibleValue => plantTags.includes(compatibleValue));
    }

    return false;
  },

  isMatchTimeCommitment(timeCommitment, plantTags) {
    const timeTagMapping = {
      'minimal': ['ultra-low-maintenance', 'drought-tolerant', 'neglect-tolerant'],
      'light': ['low-maintenance', 'weekly-care', 'easy-care'],
      'moderate': ['moderate-care', 'regular-attention'],
      'intensive': ['high-maintenance', 'daily-care', 'detailed-care']
    };

    const expectedTags = timeTagMapping[timeCommitment] || [];
    return expectedTags.some(tag => plantTags.includes(tag));
  },

  isMatchShape(shape, plantTags) {
    const shapeTagMapping = {
      'upright': ['tree-like', 'upright-growth', 'vertical'],
      'bushy': ['full-foliage', 'bushy-growth', 'dense'],
      'trailing': ['cascading', 'hanging-basket', 'vine-like'],
      'rosette': ['compact', 'rosette-form', 'symmetrical'],
      'architectural': ['sculptural', 'statement-piece', 'dramatic']
    };

    const expectedTags = shapeTagMapping[shape] || [];
    return expectedTags.some(tag => plantTags.includes(tag));
  },

  isMatchColor(color, plantTags) {
    const colorTagMapping = {
      'green': ['solid-green', 'classic', 'monochrome'],
      'variegated': ['colorful', 'patterned', 'multi-colored'],
      'flowering': ['blooming', 'seasonal-color', 'floral'],
      'mixed': ['variety-friendly', 'diverse']
    };

    const expectedTags = colorTagMapping[color] || [];
    return expectedTags.some(tag => plantTags.includes(tag));
  },

  // 图片加载成功
  onImageLoad(e) {
    console.log('图片加载成功:', e.detail);
  },

  // 图片加载失败
  onImageError(e) {
    console.error('图片加载失败:', e.detail);
  },

  goDetail(e){
    const id = e.currentTarget.dataset.id;
    tt.navigateTo({ url: `/pages/detail/index?id=${id}` });
  },

  toggleDetailedView() {
    this.setData({
      showDetailedReasons: !this.data.showDetailedReasons
    });
  }
});

