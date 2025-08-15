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
        if (algorithm === 'enhanced') {
          // 使用增强版推荐理由生成
          const reason = this.generateEnhancedReason(answers, item, userProfile);
          return { ...item, _reason: reason, _reasonText: reason.text };
        } else {
          // 使用原始推荐理由
          const r = getRecommendationReason(answers, item) || {};
          const exact = (r.exactMatches||[]).join('、') || '无';
          const compat = (r.compatibleMatches||[]).join('、') || '无';
          const reasonText = `契合:${exact}  兼容:${compat}  分:${r.score||0}`;
          return { ...item, _reason: r, _reasonText: reasonText };
        }
      }catch(_){
        return item;
      }
    });
    this.setData({ list: enhanced });
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

    const matchPercentage = this.calculateMatchPercentage(matches, safetyScore);
    const text = matchTexts.length > 0 ?
      `${matchTexts.join('；')} (匹配度：${matchPercentage}%)` :
      `基本符合您的需求 (匹配度：${matchPercentage}%)`;

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

