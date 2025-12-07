/**
 * 植物匹配逻辑工具
 * 实现精准的植物匹配和评分逻辑
 * 支持多维度匹配和兼容性判断
 */

class PlantMatcher {
  constructor() {
    // 维度匹配权重
    this.matchWeights = {
      exact: 1.0,      // 精确匹配
      compatible: 0.7,  // 兼容匹配
      partial: 0.4     // 部分匹配
    };

    // 兼容性规则
    this.compatibilityRules = {
      light: {
        'low': ['medium'],           // 弱光环境可以适应中等光照植物
        'medium': ['low', 'high'],   // 中等光照最灵活
        'high': ['medium']           // 强光环境可以适应中等光照植物
      },
      space: {
        'large': ['medium', 'small'], // 大空间可以放中小型植物
        'medium': ['small'],          // 中等空间可以放小型植物
        'small': []                   // 小空间只能放小型植物
      },
      level: {
        'expert': ['intermediate', 'beginner'],     // 专家可以养护所有难度
        'intermediate': ['beginner'],               // 进阶可以养护简单植物
        'beginner': []                             // 新手只能养护简单植物
      },
      timeCommitment: {
        'intensive': ['moderate', 'light', 'minimal'],  // 时间充足可以选择任何植物
        'moderate': ['light', 'minimal'],               // 中等时间可以选择低维护植物
        'light': ['minimal'],                           // 少量时间只能选择极简植物
        'minimal': []                                   // 几乎没时间只能选择最简单的
      }
    };
  }

  /**
   * 匹配植物标签
   * @param {string|Array} userValue - 用户选择的值
   * @param {Array} plantTags - 植物标签数组
   * @param {string} dimension - 维度名称
   * @returns {Object} 匹配结果 { type: 'exact'|'compatible'|'partial'|'none', score: number }
   */
  matchTags(userValue, plantTags, dimension) {
    if (!plantTags || !Array.isArray(plantTags)) {
      return { type: 'none', score: 0 };
    }

    // 处理多选值
    const values = Array.isArray(userValue) ? userValue : [userValue];
    let bestMatch = { type: 'none', score: 0 };

    for (const value of values) {
      if (!value) continue;

      // 1. 精确匹配
      if (plantTags.includes(value)) {
        return { type: 'exact', score: this.matchWeights.exact };
      }

      // 2. 兼容性匹配
      const compatibleMatch = this.checkCompatibility(value, plantTags, dimension);
      if (compatibleMatch.score > bestMatch.score) {
        bestMatch = compatibleMatch;
      }

      // 3. 语义匹配（基于标签语义）
      const semanticMatch = this.checkSemanticMatch(value, plantTags, dimension);
      if (semanticMatch.score > bestMatch.score) {
        bestMatch = semanticMatch;
      }
    }

    return bestMatch;
  }

  /**
   * 检查兼容性匹配
   * @param {string} userValue - 用户值
   * @param {Array} plantTags - 植物标签
   * @param {string} dimension - 维度
   * @returns {Object} 匹配结果
   */
  checkCompatibility(userValue, plantTags, dimension) {
    const rules = this.compatibilityRules[dimension];
    if (!rules || !rules[userValue]) {
      return { type: 'none', score: 0 };
    }

    const compatibleValues = rules[userValue];
    for (const compatibleValue of compatibleValues) {
      if (plantTags.includes(compatibleValue)) {
        return { type: 'compatible', score: this.matchWeights.compatible };
      }
    }

    return { type: 'none', score: 0 };
  }

  /**
   * 检查语义匹配
   * @param {string} userValue - 用户值
   * @param {Array} plantTags - 植物标签
   * @param {string} dimension - 维度
   * @returns {Object} 匹配结果
   */
  checkSemanticMatch(userValue, plantTags, dimension) {
    const semanticMappings = {
      light: {
        'low': ['shade-tolerant', 'low-light', 'indoor-friendly'],
        'medium': ['partial-sun', 'adaptable', 'moderate-light'],
        'high': ['full-sun', 'sun-loving', 'bright-light'],
        'artificial': ['led-friendly', 'artificial-light', 'office-friendly']
      },
      space: {
        'small': ['compact', 'desktop', 'windowsill', 'mini'],
        'medium': ['tabletop', 'corner', 'medium-size'],
        'large': ['floor-standing', 'statement-piece', 'tree-like', 'large-scale']
      },
      level: {
        'beginner': ['foolproof', 'hardy-plants', 'easy-care', 'low-maintenance'],
        'intermediate': ['moderate-care', 'forgiving-plants', 'skill-building'],
        'expert': ['challenging', 'high-maintenance', 'rare-species', 'advanced-care']
      },
      timeCommitment: {
        'minimal': ['neglect-tolerant', 'ultra-low-maintenance', 'drought-tolerant'],
        'light': ['weekly-care', 'low-maintenance', 'easy-care'],
        'moderate': ['regular-attention', 'moderate-care', 'standard-care'],
        'intensive': ['daily-care', 'high-maintenance', 'detailed-care']
      },
      plantShape: {
        'upright': ['tree-like', 'upright-growth', 'vertical'],
        'bushy': ['full-foliage', 'bushy-growth', 'dense'],
        'trailing': ['cascading', 'hanging-basket', 'vine-like'],
        'rosette': ['compact', 'rosette-form', 'symmetrical'],
        'architectural': ['sculptural', 'statement-piece', 'dramatic']
      },
      colorPreference: {
        'green': ['solid-green', 'classic', 'monochrome'],
        'variegated': ['colorful', 'patterned', 'multi-colored'],
        'flowering': ['blooming', 'seasonal-color', 'floral'],
        'mixed': ['variety-friendly', 'diverse']
      }
    };

    const mappings = semanticMappings[dimension];
    if (!mappings || !mappings[userValue]) {
      return { type: 'none', score: 0 };
    }

    const semanticTags = mappings[userValue];
    for (const tag of semanticTags) {
      if (plantTags.includes(tag)) {
        return { type: 'partial', score: this.matchWeights.partial };
      }
    }

    return { type: 'none', score: 0 };
  }

  /**
   * 计算植物与用户需求的整体匹配度
   * @param {Object} userAnswers - 用户答案映射
   * @param {Object} plant - 植物对象
   * @returns {Object} 匹配结果详情
   */
  calculatePlantMatch(userAnswers, plant) {
    const plantTags = plant.tags || [];
    const matches = {};
    let totalScore = 0;
    let maxPossibleScore = 0;

    // 定义需要匹配的维度
    const dimensions = [
      'lightCondition', 'spaceType', 'experienceLevel', 'timeCommitment',
      'plantShape', 'colorPreference', 'budget'
    ];

    dimensions.forEach(dimension => {
      const userValue = userAnswers[dimension];
      if (userValue !== undefined) {
        const match = this.matchTags(userValue, plantTags, dimension);
        matches[dimension] = match;
        totalScore += match.score;
        maxPossibleScore += this.matchWeights.exact;
      }
    });

    // 计算匹配百分比
    const matchPercentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    return {
      totalScore,
      maxPossibleScore,
      matchPercentage: Math.round(matchPercentage),
      dimensionMatches: matches,
      plant: plant
    };
  }

  /**
   * 生成匹配解释文本
   * @param {Object} matchResult - 匹配结果
   * @returns {string} 解释文本
   */
  generateMatchExplanation(matchResult) {
    const { dimensionMatches, matchPercentage } = matchResult;
    const explanations = [];

    // 按匹配类型分组
    const exactMatches = [];
    const compatibleMatches = [];
    const partialMatches = [];

    Object.entries(dimensionMatches).forEach(([dimension, match]) => {
      const dimensionName = this.getDimensionDisplayName(dimension);
      
      switch (match.type) {
        case 'exact':
          exactMatches.push(dimensionName);
          break;
        case 'compatible':
          compatibleMatches.push(dimensionName);
          break;
        case 'partial':
          partialMatches.push(dimensionName);
          break;
      }
    });

    // 生成解释文本
    if (exactMatches.length > 0) {
      explanations.push(`完全符合您的${exactMatches.join('、')}需求`);
    }

    if (compatibleMatches.length > 0) {
      explanations.push(`与您的${compatibleMatches.join('、')}需求兼容`);
    }

    if (partialMatches.length > 0) {
      explanations.push(`部分满足您的${partialMatches.join('、')}偏好`);
    }

    const baseExplanation = explanations.length > 0 ? explanations.join('，') : '基本符合您的需求';
    
    return `${baseExplanation}（匹配度：${matchPercentage}%）`;
  }

  /**
   * 获取维度显示名称
   * @param {string} dimension - 维度名称
   * @returns {string} 显示名称
   */
  getDimensionDisplayName(dimension) {
    const displayNames = {
      lightCondition: '光照条件',
      spaceType: '空间需求',
      experienceLevel: '养护经验',
      timeCommitment: '时间投入',
      plantShape: '植物形态',
      colorPreference: '色彩偏好',
      budget: '预算范围'
    };

    return displayNames[dimension] || dimension;
  }

  /**
   * 批量匹配植物
   * @param {Object} userAnswers - 用户答案
   * @param {Array} plants - 植物列表
   * @returns {Array} 排序后的匹配结果
   */
  batchMatchPlants(userAnswers, plants) {
    return plants
      .map(plant => this.calculatePlantMatch(userAnswers, plant))
      .sort((a, b) => b.totalScore - a.totalScore);
  }
}

module.exports = {
  PlantMatcher
};
