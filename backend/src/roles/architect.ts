import { BaseRole, RoleConfig } from './base';
import { logger } from '../utils/logger';

export class CodeArchitect extends BaseRole {
  private codeTemplates: {
    [key: string]: {
      framework: string;
      dependencies: string[];
      structure: string;
      bestPractices: string[];
    };
  };

  private currentProject: {
    framework: string;
    components: string[];
    state: any;
    dependencies: string[];
  };

  constructor(config: RoleConfig, web3: any) {
    super(config, web3);
    this.codeTemplates = {
      'react': {
        framework: 'React',
        dependencies: ['react', 'react-dom', 'typescript', '@types/react', '@types/react-dom'],
        structure: 'components-based',
        bestPractices: [
          'Use functional components with hooks',
          'Implement proper state management',
          'Follow component composition',
          'Use TypeScript for type safety'
        ]
      },
      'next': {
        framework: 'Next.js',
        dependencies: ['next', 'react', 'react-dom', 'typescript', '@types/react', '@types/react-dom'],
        structure: 'pages-based',
        bestPractices: [
          'Use server-side rendering when needed',
          'Implement proper routing',
          'Optimize for performance',
          'Use API routes for backend integration'
        ]
      },
      'vue': {
        framework: 'Vue',
        dependencies: ['vue', 'vuex', 'typescript', '@vue/cli-service'],
        structure: 'components-based',
        bestPractices: [
          'Use composition API',
          'Implement proper state management',
          'Follow component composition',
          'Use TypeScript for type safety'
        ]
      }
    };

    this.currentProject = {
      framework: 'react',
      components: [],
      state: {},
      dependencies: []
    };
  }

  async processMessage(message: string, userWallet: string): Promise<any> {
    try {
      this.addToMemory('user', message);
      
      // Analyze the requirements and generate code
      const { code, preview } = await this.generateCode(message);
      
      this.addToMemory('agent', code);
      
      return {
        role: this.name,
        response: {
          code: code,
          preview: preview,
          framework: this.currentProject.framework,
          dependencies: this.currentProject.dependencies
        },
        wallet: userWallet,
        action: 'GenerateCode'
      };
    } catch (error) {
      logger.error('Error processing architecture message:', error);
      throw error;
    }
  }

  private async generateCode(message: string): Promise<{ code: string; preview: string }> {
    // Detect framework and requirements
    const framework = this.detectFramework(message);
    this.currentProject.framework = framework;
    
    // Generate component structure
    const components = this.generateComponentStructure(message);
    this.currentProject.components = components;

    // Generate state management
    const state = this.generateStateManagement(message);
    this.currentProject.state = state;

    // Generate code for each component
    const componentCode = components.map(component => 
      this.generateComponentCode(component, state)
    ).join('\n\n');

    // Generate preview code
    const previewCode = this.generatePreviewCode(components, state);

    return {
      code: this.wrapInProjectStructure(componentCode, framework),
      preview: previewCode
    };
  }

  private detectFramework(message: string): string {
    const messageLower = message.toLowerCase();
    if (messageLower.includes('next') || messageLower.includes('server')) {
      return 'next';
    } else if (messageLower.includes('vue')) {
      return 'vue';
    }
    return 'react'; // Default to React
  }

  private generateComponentStructure(message: string): string[] {
    // Analyze message to determine required components
    const components = ['App'];
    
    if (message.toLowerCase().includes('form')) {
      components.push('Form');
    }
    if (message.toLowerCase().includes('list')) {
      components.push('List');
    }
    if (message.toLowerCase().includes('card')) {
      components.push('Card');
    }
    if (message.toLowerCase().includes('modal')) {
      components.push('Modal');
    }

    return components;
  }

  private generateStateManagement(message: string): any {
    // Generate state structure based on requirements
    const state: any = {
      data: {},
      ui: {
        loading: false,
        error: null
      }
    };

    if (message.toLowerCase().includes('form')) {
      state.form = {
        values: {},
        errors: {},
        touched: {}
      };
    }

    if (message.toLowerCase().includes('list')) {
      state.list = {
        items: [],
        pagination: {
          page: 1,
          limit: 10
        }
      };
    }

    return state;
  }

  private generateComponentCode(component: string, state: any): string {
    const template = this.codeTemplates[this.currentProject.framework];
    
    switch (component) {
      case 'App':
        return this.generateAppComponent(template);
      case 'Form':
        return this.generateFormComponent(template, state.form);
      case 'List':
        return this.generateListComponent(template, state.list);
      case 'Card':
        return this.generateCardComponent(template);
      case 'Modal':
        return this.generateModalComponent(template);
      default:
        return '';
    }
  }

  private generateAppComponent(template: any): string {
    return `import React from 'react';
import { ${this.currentProject.components.filter(c => c !== 'App').join(', ')} } from './components';

const App: React.FC = () => {
  return (
    <div className="app">
      <header>
        <h1>${this.name} Application</h1>
      </header>
      <main>
        ${this.currentProject.components.filter(c => c !== 'App').map(c => 
          `<${c} />`
        ).join('\n        ')}
      </main>
    </div>
  );
};

export default App;`;
  }

  private generateFormComponent(template: any, formState: any): string {
    return `import React, { useState } from 'react';

interface FormProps {
  onSubmit: (values: any) => void;
}

const Form: React.FC<FormProps> = ({ onSubmit }) => {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate and submit
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <input
          type="text"
          name="field"
          onChange={handleChange}
          value={values['field'] || ''}
        />
      </div>
      <button type="submit">Submit</button>
    </form>
  );
};

export default Form;`;
  }

  private generateListComponent(template: any, listState: any): string {
    return `import React from 'react';

interface ListProps {
  items: any[];
  onItemClick: (item: any) => void;
}

const List: React.FC<ListProps> = ({ items, onItemClick }) => {
  return (
    <div className="list">
      {items.map((item, index) => (
        <div
          key={index}
          className="list-item"
          onClick={() => onItemClick(item)}
        >
          {JSON.stringify(item)}
        </div>
      ))}
    </div>
  );
};

export default List;`;
  }

  private generateCardComponent(template: any): string {
    return `import React from 'react';

interface CardProps {
  title: string;
  content: string;
}

const Card: React.FC<CardProps> = ({ title, content }) => {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p>{content}</p>
    </div>
  );
};

export default Card;`;
  }

  private generateModalComponent(template: any): string {
    return `import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
};

export default Modal;`;
  }

  private generatePreviewCode(components: string[], state: any): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>${this.name} Preview</title>
  <style>
    .app { font-family: Arial, sans-serif; }
    .form-group { margin: 10px 0; }
    .list-item { padding: 10px; border: 1px solid #ccc; margin: 5px 0; }
    .card { border: 1px solid #ccc; padding: 20px; margin: 10px; }
    .modal-overlay { 
      position: fixed; 
      top: 0; left: 0; right: 0; bottom: 0; 
      background: rgba(0,0,0,0.5); 
      display: flex; 
      justify-content: center; 
      align-items: center; 
    }
    .modal-content { 
      background: white; 
      padding: 20px; 
      border-radius: 5px; 
      position: relative; 
    }
    .close-button { 
      position: absolute; 
      top: 10px; 
      right: 10px; 
      border: none; 
      background: none; 
      font-size: 20px; 
      cursor: pointer; 
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    // Initialize state
    const state = ${JSON.stringify(state, null, 2)};
    
    // Render components
    const root = document.getElementById('root');
    root.innerHTML = \`
      <div class="app">
        <header>
          <h1>${this.name} Application</h1>
        </header>
        <main>
          ${components.filter(c => c !== 'App').map(c => 
            \`<div class="\${c.toLowerCase()}">
              <h2>\${c} Component</h2>
              <p>This is a preview of the \${c} component.</p>
            </div>\`
          ).join('\n          ')}
        </main>
      </div>
    \`;
  </script>
</body>
</html>`;
  }

  private wrapInProjectStructure(code: string, framework: string): string {
    const template = this.codeTemplates[framework];
    return `// Project Structure for ${template.framework}
// Dependencies: ${template.dependencies.join(', ')}

${code}

// Best Practices:
${template.bestPractices.map(bp => `// - ${bp}`).join('\n')}`;
  }
} 