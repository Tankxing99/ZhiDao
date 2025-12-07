/**
 * 动态问卷管理器
 * 实现分阶段问卷流程和条件触发逻辑
 * 根据用户画像动态调整问卷内容
 */

class DynamicQuestionnaire {
  constructor(questionBank) {
    this.questionBank = questionBank;
    this.userProfile = {};
    this.answers = [];
    this.currentPhase = 'userProfile';
    this.currentQuestionIndex = 0;
    this.phaseOrder = ['userProfile', 'environment', 'aesthetic', 'safety'];
  }

  /**
   * 获取下一个问题
   * @returns {Object|null} 问题对象或null（问卷结束）
   */
  getNextQuestion() {
    const currentPhaseConfig = this.questionBank[this.currentPhase];
    
    if (!currentPhaseConfig) {
      return null; // 问卷结束
    }

    // 检查当前阶段是否还有问题
    if (this.currentQuestionIndex < currentPhaseConfig.questions.length) {
      const question = currentPhaseConfig.questions[this.currentQuestionIndex];
      return {
        ...question,
        phase: this.currentPhase,
        phaseTitle: currentPhaseConfig.name,
        phaseDescription: currentPhaseConfig.description,
        questionIndex: this.currentQuestionIndex,
        totalInPhase: currentPhaseConfig.questions.length,
        overallProgress: this.calculateOverallProgress()
      };
    }

    // 当前阶段完成，切换到下一阶段
    this.moveToNextPhase();
    return this.getNextQuestion();
  }

  /**
   * 处理用户答案并更新画像
   * @param {string} questionId - 问题ID
   * @param {string|Array} answer - 用户答案
   */
  processAnswer(questionId, answer) {
    // 记录答案
    this.answers.push({ id: questionId, value: answer });
    
    // 更新用户画像
    this.updateUserProfile(questionId, answer);
    
    // 移动到下一个问题
    this.currentQuestionIndex++;
  }

  /**
   * 更新用户画像
   * @param {string} questionId - 问题ID
   * @param {string|Array} answer - 用户答案
   */
  updateUserProfile(questionId, answer) {
    const question = this.findQuestion(questionId);
    if (!question) return;

    // 处理单选答案
    if (question.type === 'single') {
      const selectedOption = question.options.find(opt => opt.value === answer);
      if (selectedOption && selectedOption.tags) {
        selectedOption.tags.forEach(tag => {
          this.userProfile[tag] = true;
        });
      }
    }

    // 处理多选答案
    if (question.type === 'multiple' && Array.isArray(answer)) {
      answer.forEach(value => {
        const selectedOption = question.options.find(opt => opt.value === value);
        if (selectedOption && selectedOption.tags) {
          selectedOption.tags.forEach(tag => {
            this.userProfile[tag] = true;
          });
        }
      });
    }

    // 特殊字段处理
    switch (questionId) {
      case 'experienceLevel':
        this.userProfile.experienceLevel = answer;
        this.userProfile.isNewUser = (answer === 'beginner');
        break;
      case 'hasPets':
        this.userProfile.hasPets = (answer !== 'none');
        this.userProfile.petTypes = answer !== 'none' ? [answer] : [];
        break;
      case 'livingStatus':
        if (answer === 'family') {
          this.userProfile.hasChildren = true;
        }
        break;
      case 'budget':
        this.userProfile.budgetLevel = answer;
        break;
    }
  }

  /**
   * 移动到下一阶段
   */
  moveToNextPhase() {
    const currentIndex = this.phaseOrder.indexOf(this.currentPhase);
    
    // 寻找下一个需要触发的阶段
    for (let i = currentIndex + 1; i < this.phaseOrder.length; i++) {
      const nextPhase = this.phaseOrder[i];
      if (this.shouldTriggerPhase(nextPhase)) {
        this.currentPhase = nextPhase;
        this.currentQuestionIndex = 0;
        return;
      }
    }
    
    // 没有更多阶段，问卷结束
    this.currentPhase = 'completed';
  }

  /**
   * 判断是否应该触发某个阶段
   * @param {string} phase - 阶段名称
   * @returns {boolean} 是否应该触发
   */
  shouldTriggerPhase(phase) {
    const phaseConfig = this.questionBank[phase];
    if (!phaseConfig || !phaseConfig.triggerConditions) return true;

    const conditions = phaseConfig.triggerConditions;
    
    // 如果条件是 "all"，总是触发
    if (conditions.includes('all')) return true;
    
    // 检查用户画像是否匹配触发条件
    return conditions.some(condition => this.userProfile[condition]);
  }

  /**
   * 计算整体进度
   * @returns {Object} 进度信息
   */
  calculateOverallProgress() {
    let totalQuestions = 0;
    let answeredQuestions = this.answers.length;
    
    // 计算需要回答的总问题数（基于触发条件）
    this.phaseOrder.forEach(phase => {
      if (this.shouldTriggerPhase(phase)) {
        const phaseConfig = this.questionBank[phase];
        if (phaseConfig) {
          totalQuestions += phaseConfig.questions.length;
        }
      }
    });

    return {
      current: answeredQuestions,
      total: totalQuestions,
      percentage: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0
    };
  }

  /**
   * 查找问题
   * @param {string} questionId - 问题ID
   * @returns {Object|null} 问题对象
   */
  findQuestion(questionId) {
    for (const phase of Object.values(this.questionBank)) {
      if (phase.questions) {
        const question = phase.questions.find(q => q.id === questionId);
        if (question) return question;
      }
    }
    return null;
  }

  /**
   * 获取个性化推荐权重
   * @returns {Object} 权重配置
   */
  getPersonalizedWeights() {
    const baseWeights = {
      environment: 0.4,
      aesthetic: 0.3,
      care: 0.2,
      safety: 0.1
    };

    // 根据用户画像调整权重
    if (this.userProfile.hasPets) {
      baseWeights.safety = 0.3;
      baseWeights.environment = 0.35;
      baseWeights.aesthetic = 0.2;
      baseWeights.care = 0.15;
    }

    if (this.userProfile['aesthetic-important']) {
      baseWeights.aesthetic = 0.4;
      baseWeights.environment = 0.3;
    }

    if (this.userProfile['guidance-needed']) {
      baseWeights.care = 0.35;
      baseWeights.environment = 0.35;
      baseWeights.aesthetic = 0.2;
      baseWeights.safety = 0.1;
    }

    return baseWeights;
  }

  /**
   * 获取排除标签列表
   * @returns {Array} 排除标签数组
   */
  getExcludeTags() {
    const excludeTags = [];
    
    this.answers.forEach(answer => {
      const question = this.findQuestion(answer.id);
      if (!question) return;
      
      if (question.type === 'single') {
        const selectedOption = question.options.find(opt => opt.value === answer.value);
        if (selectedOption && selectedOption.excludeTags) {
          excludeTags.push(...selectedOption.excludeTags);
        }
      }

      if (question.type === 'multiple' && Array.isArray(answer.value)) {
        answer.value.forEach(value => {
          const selectedOption = question.options.find(opt => opt.value === value);
          if (selectedOption && selectedOption.excludeTags) {
            excludeTags.push(...selectedOption.excludeTags);
          }
        });
      }
    });

    return [...new Set(excludeTags)]; // 去重
  }

  /**
   * 检查问卷是否完成
   * @returns {boolean} 是否完成
   */
  isCompleted() {
    return this.currentPhase === 'completed';
  }

  /**
   * 获取当前状态摘要
   * @returns {Object} 状态摘要
   */
  getStatus() {
    return {
      currentPhase: this.currentPhase,
      isCompleted: this.isCompleted(),
      userProfile: this.userProfile,
      answers: this.answers,
      progress: this.calculateOverallProgress()
    };
  }
}

module.exports = {
  DynamicQuestionnaire
};
