import BaseModel from './BaseModel';
import ValidationModel from './ValidationModel';

/**
 * Модель для работы с базой знаний
 * @extends BaseModel
 */
class KnowledgeModel extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.initializeFields();
  }

  /**
   * Инициализация полей модели
   */
  initializeFields() {
    // Основные поля
    this.id = this.data.id || this.generateId();
    this.title = this.data.title || '';
    this.content = this.data.content || '';
    this.category = this.data.category || 'general';
    this.tags = this.data.tags || [];
    this.version = this.data.version || 1;
    
    // Метаданные
    this.metadata = {
      author: this.data.metadata?.author || 'system',
      source: this.data.metadata?.source || 'manual',
      priority: this.data.metadata?.priority || 'medium',
      status: this.data.metadata?.status || 'draft',
      language: this.data.metadata?.language || 'ru',
      readTime: this.data.metadata?.readTime || 0,
      views: this.data.metadata?.views || 0,
      rating: this.data.metadata?.rating || 0,
      votes: this.data.metadata?.votes || 0
    };

    // Связанные документы
    this.attachments = this.data.attachments || [];
    this.relatedArticles = this.data.relatedArticles || [];
    this.externalLinks = this.data.externalLinks || [];

    // История изменений
    this.history = this.data.history || [];
    this.lastModifiedBy = this.data.lastModifiedBy || null;

    // SEO и поиск
    this.keywords = this.data.keywords || [];
    this.summary = this.data.summary || '';
    this.searchIndex = this.data.searchIndex || '';

    // Временные метки
    this.createdAt = this.data.createdAt || new Date().toISOString();
    this.updatedAt = this.data.updatedAt || new Date().toISOString();
    this.publishedAt = this.data.publishedAt || null;
    this.archivedAt = this.data.archivedAt || null;
  }

  /**
   * Валидация модели
   */
  validate() {
    const errors = [];

    // Валидация обязательных полей
    if (!this.title || this.title.trim().length < 3) {
      errors.push({
        field: 'title',
        message: 'Заголовок должен содержать минимум 3 символа'
      });
    }

    if (!this.content || this.content.trim().length < 10) {
      errors.push({
        field: 'content',
        message: 'Содержание должно содержать минимум 10 символов'
      });
    }

    if (!this.isValidCategory(this.category)) {
      errors.push({
        field: 'category',
        message: 'Недопустимая категория'
      });
    }

    // Валидация метаданных
    if (!this.isValidPriority(this.metadata.priority)) {
      errors.push({
        field: 'priority',
        message: 'Недопустимый приоритет'
      });
    }

    if (!this.isValidStatus(this.metadata.status)) {
      errors.push({
        field: 'status',
        message: 'Недопустимый статус'
      });
    }

    // Валидация тегов
    if (this.tags.length > 10) {
      errors.push({
        field: 'tags',
        message: 'Максимальное количество тегов - 10'
      });
    }

    // Валидация вложений
    if (this.attachments.length > 0) {
      const invalidAttachments = this.attachments.filter(
        att => !this.isValidAttachment(att)
      );
      if (invalidAttachments.length > 0) {
        errors.push({
          field: 'attachments',
          message: 'Некорректные вложения'
        });
      }
    }

    this.errors = errors;
    return errors.length === 0;
  }

  /**
   * Проверка допустимости категории
   */
  isValidCategory(category) {
    const validCategories = [
      'general',
      'hr',
      'recruitment',
      'onboarding',
      'policy',
      'procedure',
      'template',
      'guide',
      'faq',
      'training',
      'compliance',
      'benefits'
    ];
    return validCategories.includes(category);
  }

  /**
   * Проверка допустимости приоритета
   */
  isValidPriority(priority) {
    return ['low', 'medium', 'high', 'critical'].includes(priority);
  }

  /**
   * Проверка допустимости статуса
   */
  isValidStatus(status) {
    return ['draft', 'review', 'published', 'archived', 'deprecated'].includes(status);
  }

  /**
   * Проверка валидности вложения
   */
  isValidAttachment(attachment) {
    return attachment.name && 
           attachment.url && 
           attachment.type &&
           attachment.size > 0;
  }

  /**
   * Обновление версии
   */
  incrementVersion() {
    this.version += 1;
    this.addToHistory({
      version: this.version,
      action: 'version_update',
      timestamp: new Date().toISOString(),
      changes: []
    });
  }

  /**
   * Добавление в историю
   */
  addToHistory(entry) {
    this.history.push({
      ...entry,
      user: this.lastModifiedBy,
      timestamp: entry.timestamp || new Date().toISOString()
    });

    // Ограничиваем историю последними 50 записями
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
    }
  }

  /**
   * Публикация статьи
   */
  publish() {
    if (this.metadata.status === 'published') {
      throw new Error('Статья уже опубликована');
    }

    this.metadata.status = 'published';
    this.publishedAt = new Date().toISOString();
    this.addToHistory({
      action: 'published',
      previousStatus: this.metadata.status
    });
  }

  /**
   * Архивирование статьи
   */
  archive() {
    this.metadata.status = 'archived';
    this.archivedAt = new Date().toISOString();
    this.addToHistory({
      action: 'archived',
      previousStatus: this.metadata.status
    });
  }

  /**
   * Расчет времени чтения
   */
  calculateReadTime() {
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    this.metadata.readTime = Math.ceil(wordCount / wordsPerMinute);
    return this.metadata.readTime;
  }

  /**
   * Генерация поискового индекса
   */
  generateSearchIndex() {
    const indexParts = [
      this.title.toLowerCase(),
      this.summary.toLowerCase(),
      this.content.toLowerCase().substring(0, 500),
      this.tags.join(' ').toLowerCase(),
      this.keywords.join(' ').toLowerCase()
    ];
    
    this.searchIndex = indexParts.join(' ')
      .replace(/[^\w\sа-яё]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return this.searchIndex;
  }

  /**
   * Поиск по тексту
   */
  matchesSearch(query) {
    if (!query) return true;
    
    const searchQuery = query.toLowerCase().trim();
    const searchIndex = this.searchIndex || this.generateSearchIndex();
    
    return searchIndex.includes(searchQuery);
  }

  /**
   * Добавление тега
   */
  addTag(tag) {
    if (this.tags.length >= 10) {
      throw new Error('Достигнуто максимальное количество тегов');
    }
    
    const normalizedTag = tag.toLowerCase().trim();
    if (!this.tags.includes(normalizedTag)) {
      this.tags.push(normalizedTag);
      this.addToHistory({
        action: 'tag_added',
        tag: normalizedTag
      });
    }
  }

  /**
   * Удаление тега
   */
  removeTag(tag) {
    const index = this.tags.indexOf(tag.toLowerCase().trim());
    if (index > -1) {
      const removedTag = this.tags.splice(index, 1)[0];
      this.addToHistory({
        action: 'tag_removed',
        tag: removedTag
      });
    }
  }

  /**
   * Добавление вложения
   */
  addAttachment(attachment) {
    if (!this.isValidAttachment(attachment)) {
      throw new Error('Некорректное вложение');
    }

    this.attachments.push({
      id: this.generateId(),
      ...attachment,
      addedAt: new Date().toISOString()
    });

    this.addToHistory({
      action: 'attachment_added',
      attachment: attachment.name
    });
  }

  /**
   * Обновление рейтинга
   */
  updateRating(newRating) {
    if (newRating < 1 || newRating > 5) {
      throw new Error('Рейтинг должен быть от 1 до 5');
    }

    const totalRating = this.metadata.rating * this.metadata.votes;
    this.metadata.votes += 1;
    this.metadata.rating = (totalRating + newRating) / this.metadata.votes;
  }

  /**
   * Увеличение счетчика просмотров
   */
  incrementViews() {
    this.metadata.views += 1;
  }

  /**
   * Клонирование статьи
   */
  clone() {
    const clonedData = { ...this.data };
    delete clonedData.id;
    clonedData.title = `${this.title} (копия)`;
    clonedData.metadata = { ...this.metadata, status: 'draft', views: 0, rating: 0, votes: 0 };
    clonedData.history = [];
    clonedData.createdAt = new Date().toISOString();
    clonedData.publishedAt = null;
    
    return new KnowledgeModel(clonedData);
  }

  /**
   * Экспорт в Markdown
   */
  toMarkdown() {
    let markdown = `# ${this.title}\n\n`;
    
    if (this.summary) {
      markdown += `> ${this.summary}\n\n`;
    }
    
    if (this.tags.length > 0) {
      markdown += `**Теги:** ${this.tags.map(t => `#${t}`).join(' ')}\n\n`;
    }
    
    markdown += `${this.content}\n\n`;
    
    if (this.relatedArticles.length > 0) {
      markdown += `## Связанные статьи\n`;
      this.relatedArticles.forEach(article => {
        markdown += `- [${article.title}](${article.id})\n`;
      });
      markdown += '\n';
    }
    
    if (this.externalLinks.length > 0) {
      markdown += `## Внешние ссылки\n`;
      this.externalLinks.forEach(link => {
        markdown += `- [${link.title}](${link.url})\n`;
      });
    }
    
    return markdown;
  }

  /**
   * Преобразование в JSON для API
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      category: this.category,
      tags: this.tags,
      version: this.version,
      metadata: this.metadata,
      attachments: this.attachments,
      relatedArticles: this.relatedArticles,
      externalLinks: this.externalLinks,
      keywords: this.keywords,
      summary: this.summary,
      searchIndex: this.searchIndex,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      publishedAt: this.publishedAt,
      archivedAt: this.archivedAt,
      lastModifiedBy: this.lastModifiedBy,
      readTime: this.metadata.readTime
    };
  }

  /**
   * Создание из JSON
   */
  static fromJSON(json) {
    return new KnowledgeModel(json);
  }
}

export default KnowledgeModel;
