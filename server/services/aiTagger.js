import OpenAI from 'openai';

// Initialize OpenAI client (will use environment variable or fallback to local processing)
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
} catch (error) {
  console.log('OpenAI not configured, using fallback tagging');
}

// Fallback keyword extraction for when OpenAI is not available
const extractKeywordsFromText = (text, title = '') => {
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your',
    'his', 'her', 'its', 'our', 'their', 'about', 'above', 'across', 'after', 'against', 'along',
    'among', 'around', 'because', 'before', 'behind', 'below', 'beneath', 'beside', 'between',
    'beyond', 'during', 'except', 'from', 'inside', 'into', 'like', 'near', 'since', 'through',
    'throughout', 'until', 'upon', 'within', 'without', 'said', 'says', 'get', 'got', 'go', 'goes',
    'went', 'come', 'came', 'take', 'took', 'make', 'made', 'see', 'saw', 'know', 'knew', 'think',
    'thought', 'look', 'looked', 'use', 'used', 'find', 'found', 'give', 'gave', 'tell', 'told',
    'become', 'became', 'leave', 'left', 'feel', 'felt', 'put', 'set', 'keep', 'kept', 'let',
    'begin', 'began', 'seem', 'seemed', 'help', 'helped', 'show', 'showed', 'hear', 'heard',
    'play', 'played', 'run', 'ran', 'move', 'moved', 'live', 'lived', 'believe', 'believed',
    'bring', 'brought', 'happen', 'happened', 'write', 'wrote', 'provide', 'provided', 'sit',
    'sat', 'stand', 'stood', 'lose', 'lost', 'pay', 'paid', 'meet', 'met', 'include', 'included',
    'continue', 'continued', 'set', 'learn', 'learned', 'change', 'changed', 'lead', 'led',
    'understand', 'understood', 'watch', 'watched', 'follow', 'followed', 'stop', 'stopped',
    'create', 'created', 'speak', 'spoke', 'read', 'allow', 'allowed', 'add', 'added', 'spend',
    'spent', 'grow', 'grew', 'open', 'opened', 'walk', 'walked', 'win', 'won', 'offer', 'offered',
    'remember', 'remembered', 'love', 'loved', 'consider', 'considered', 'appear', 'appeared',
    'buy', 'bought', 'wait', 'waited', 'serve', 'served', 'die', 'died', 'send', 'sent', 'expect',
    'expected', 'build', 'built', 'stay', 'stayed', 'fall', 'fell', 'cut', 'reach', 'reached',
    'kill', 'killed', 'remain', 'remained', 'suggest', 'suggested', 'raise', 'raised', 'pass',
    'passed', 'sell', 'sold', 'require', 'required', 'report', 'reported', 'decide', 'decided',
    'pull', 'pulled'
  ]);

  // Combine title and text for analysis
  const fullText = `${title} ${text}`.toLowerCase();
  
  // Extract words and filter
  const words = fullText
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 3 && 
      !commonWords.has(word) && 
      !/^\d+$/.test(word)
    );

  // Count word frequency
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  // Get top words
  const topWords = Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 15)
    .map(([word]) => word);

  // Convert to more readable tags
  const tags = topWords.map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  return tags.slice(0, 8); // Return top 8 tags
};

// Category detection based on content patterns
const detectCategories = (text, title, url) => {
  const categories = [];
  const content = `${title} ${text}`.toLowerCase();
  const domain = new URL(url).hostname.toLowerCase();

  // Technology keywords
  if (content.match(/\b(javascript|python|react|node|api|database|software|programming|code|developer|tech|ai|machine learning|blockchain|crypto)\b/)) {
    categories.push('Technology');
  }

  // Business keywords
  if (content.match(/\b(business|startup|entrepreneur|marketing|sales|finance|investment|strategy|management|leadership)\b/)) {
    categories.push('Business');
  }

  // News keywords
  if (content.match(/\b(news|breaking|report|announced|government|politics|election|policy|crisis|update)\b/) || 
      domain.includes('news') || domain.includes('cnn') || domain.includes('bbc')) {
    categories.push('News');
  }

  // Science keywords
  if (content.match(/\b(research|study|science|scientific|experiment|discovery|analysis|data|climate|health|medical)\b/)) {
    categories.push('Science');
  }

  // Tutorial/Guide keywords
  if (content.match(/\b(how to|tutorial|guide|step|learn|beginner|advanced|tips|tricks|example)\b/)) {
    categories.push('Tutorial');
  }

  // Opinion/Blog keywords
  if (content.match(/\b(opinion|think|believe|personal|blog|thoughts|perspective|view|experience)\b/)) {
    categories.push('Opinion');
  }

  return categories.length > 0 ? categories : ['General'];
};

export const generateTags = async (title, content, url, description = '') => {
  try {
    const textToAnalyze = `${title}\n${description}\n${content}`.substring(0, 3000); // Limit for API efficiency
    
    // Try AI-based tagging first
    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a content tagging expert. Generate 5-8 relevant tags for the given article content. Return only a JSON array of strings, no other text. Tags should be concise, relevant, and useful for categorization and search."
            },
            {
              role: "user",
              content: `Title: ${title}\nURL: ${url}\nDescription: ${description}\nContent: ${textToAnalyze}`
            }
          ],
          max_tokens: 100,
          temperature: 0.3
        });

        const response = completion.choices[0]?.message?.content?.trim();
        if (response) {
          const aiTags = JSON.parse(response);
          if (Array.isArray(aiTags) && aiTags.length > 0) {
            // Add categories to AI tags
            const categories = detectCategories(content, title, url);
            return [...new Set([...categories, ...aiTags])].slice(0, 10);
          }
        }
      } catch (aiError) {
        console.log('AI tagging failed, using fallback:', aiError.message);
      }
    }

    // Fallback to keyword extraction
    const keywordTags = extractKeywordsFromText(textToAnalyze, title);
    const categories = detectCategories(content, title, url);
    
    return [...new Set([...categories, ...keywordTags])].slice(0, 8);
    
  } catch (error) {
    console.error('Tag generation error:', error);
    return ['General', 'Article'];
  }
};