// Simple flattener for server/zhidao-api/data/enhanced_question_bank.json
// Usage: node scripts/flatten-question-bank.js
const fs = require('fs');
const path = require('path');

function flattenEnhancedQuestionBank(configObj){
  try{
    const qb = (configObj && configObj.questionBank) || {};
    const sections = Object.values(qb).filter(x=>x && Array.isArray(x.questions));
    const arr = [];
    sections.forEach(sec=>{
      sec.questions.forEach(q=>{ if(q && q.id){ arr.push(q); } });
    });
    return arr;
  }catch(_){ return []; }
}

(function main(){
  const input = path.join(__dirname, '..', 'server', 'zhidao-api', 'data', 'enhanced_question_bank.json');
  const out = path.join(__dirname, '..', 'server', 'zhidao-api', 'data', 'flattened_question_bank.json');
  const raw = JSON.parse(fs.readFileSync(input, 'utf-8'));
  const flat = flattenEnhancedQuestionBank(raw);
  fs.writeFileSync(out, JSON.stringify({ version: raw.version || 'v2.1', questionBank: flat }, null, 2));
  console.log(`[flatten] wrote ${flat.length} questions to ${out}`);
})();

