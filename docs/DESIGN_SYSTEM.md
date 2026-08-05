# Design System - Chatwoot Clone

## Overview

Design system untuk Chatwoot clone menggunakan **Tailwind CSS** sebagai foundation dengan custom design tokens untuk konsistensi UI.

---

## 1. Color Palette

### Primary Colors
```typescript
// tailwind.config.ts extensions
{
  colors: {
    // Brand Colors
    primary: {
      50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#93C5FD',
          300: '#60A5FA',
          400: '#3B82F6',    // primary.DEFAULT (CTA, links)
          500: '#2563EB',
          600: '#1D4ED8',    // primary-dark (hover states)
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#1E293B',
    },
    
    // Status Colors
    success: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#8BD14D',
      300: '#6BCF2A',
      400: '#22C55E',    // success.DEFAULT
      500: '#16A34A',
      600: '#15803D',
    },
    
    warning: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FACC15',    // warning.DEFAULT
          500: '#CA8A04',
          600: '#A16207',
    },
    
    danger: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#EF4444',    // danger.DEFAULT (destructive actions)
          500: '#DC2626',
          600: '#B91C1C',
    },
    
    // Semantic Colors
    info: '#3B82F6',
    gray: {
      50: '#FAFAFA',
      100: '#F5F5F5',
          200: '#EEEEEE',
          300: '#E0E0E0',
          400: '#BDBDBD',
          500: '#9E9E9E',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#262626',
    },
    
    // Background Colors
    background: {
      light: '#FFFFFF',
      dark: '#1E293B',
      sidebar: '#F8FAFC',
      chat: '#F1F5F9',
    }
  }
}
```

---

## 2. Typography Scale

### Font Stack
```css
/* global.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

### Typography Scale (Rem-based)
| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| h1 | 2rem (32px) | 700 | 1.25 | Page titles |
| h2 | 1.5rem (24px) | 600 | 1.3 | Section headers |
| h3 | 1.25rem (20px) | 600 | 1.35 | Card titles |
| h4 | 1rem (16px) | 600 | 1.4 | Label text |
| body | 0.875rem (14px) | 400 | 1.5 | Default text |
| small | 0.75rem (12px) | 400 | 1.4 | Caption, meta |

### Text Styles Class Utilities
```typescript
// utils/textStyles.ts
export const TEXT_STYLES = {
  h1: 'text-2xl font-bold leading-tight',
  h2: 'text-xl font-semibold leading-snug',
  body: 'text-sm text-gray-700 dark:text-gray-300',
  label: 'text-xs font-medium text-gray-500',
  button: 'font-medium',
};

// Usage in components
<h1 className={TEXT_STYLES.h1}>Title</h1>
<p className={TEXT_STYLES.body}>Body text</p>
```

---

## 3. Spacing Scale (8-point system)

### Spacing Tokens
```typescript
export const SPACING = {
  // XS - 2px
  xs: '0.5rem',    // 8px
  
  // SM - 4px
  sm: '1rem',      // 16px
  
  // MD - 8px
  md: '2rem',      // 32px
  
  // LG - 16px
  lg: '4rem',      // 64px
  
  // XL - 24px
  xl: '6rem',      // 96px
};

// More granular spacing for UI components
export const SPACING_GRANULAR = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
};
```

### Tailwind Spacing Configuration
```typescript
// tailwind.config.ts
theme: {
  spacing: {
    'xs': '0.5rem',      // 8px
    'sm': '1rem',        // 16px
    'md': '2rem',        // 32px
    'lg': '4rem',        // 64px
    'xl': '6rem',        // 96px
  }
}
```

---

## 4. Component Library Patterns

### Button Component
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  children,
}) => {
  const baseClasses = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800',
    danger: 'bg-danger-600 text-white hover:bg-danger-700',
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 py-2',
    lg: 'h-12 px-6 text-base',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? <Loader /> : children}
    </button>
  );
};
```

### Input Component
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'compact';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  variant = 'default',
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      <input
        className={`
          rounded-lg border px-3 py-2
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-gray-100
          placeholder-gray-400 dark:placeholder-gray-500
          focus:border-primary-500 focus:ring-1 focus:ring-primary-500
          ${error ? 'border-danger-500' : 'border-gray-300'}
          ${variant === 'compact' ? 'h-8 text-sm' : ''}
          ${className}
        `}
        {...props}
      />
      
      {error && (
        <span className="text-xs text-danger-600">{error}</span>
      )}
    </div>
  );
};
```

---

## 5. Dark/Light Mode Support

### Theme Configuration
```typescript
// types/theme.d.ts
export type Theme = 'light' | 'dark';

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}
```

### Theme Provider Component
```typescript
// components/ThemeProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
```

### Dark Mode CSS Classes
```css
/* index.css */
.light {
  --background: 210, 40%, 98%;
  --foreground: 210, 10%, 20%;
}

.dark {
  --background: 215, 28%, 15%;
  --foreground: 0, 0%, 93%;
}

html {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

---

## 6. Message Bubble Design System

### Message Variants
```typescript
export const MESSAGE_VARIANTS = {
  user: 'bg-primary-100 dark:bg-primary-900',
  contact: 'bg-gray-100 dark:bg-gray-800',
};

export const MESSAGE_ALIGNMENT = {
  user: 'justify-end',
  contact: 'justify-start',
};
```

### Message Component Structure
```typescript
interface MessageProps {
  content: string;
  senderType: 'user' | 'contact';
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  mediaUrl?: string;
  timestamp: Date;
}

export const MessageBubble: React.FC<MessageProps> = ({
  content,
  senderType,
  status = 'sent',
  mediaUrl,
  timestamp,
}) => {
  return (
    <div className={`flex flex-col gap-1 ${MESSAGE_ALIGNMENT[senderType]}`}>
      <div className={`
        max-w-[70%] px-3 py-2 rounded-lg
        ${MESSAGE_VARIANTS[senderType]}
      `}>
        {mediaUrl ? (
          <img src={mediaUrl} alt="Attachment" className="max-w-full h-auto rounded" />
        ) : (
          <p className="text-sm">{content}</p>
        )}
        
        {status === 'sent' && senderType === 'user' && (
          <CheckIcon className="w-3 h-3 mt-1 opacity-50" />
        )}
      </div>
      
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {formatTime(timestamp)}
      </span>
    </div>
  );
};
```

---

## 7. Layout System

### Dashboard Layout Structure
```typescript
// components/layouts/DashboardLayout.tsx
export const DashboardLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <HeaderContent />
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          {children}
        </div>
      </main>
    </div>
  );
};
```

### Responsive Breakpoints
```typescript
export const BREAKPOINTS = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet portrait
  lg: '1024px',  // Tablet landscape / small desktop
  xl: '1280px',  // Desktop
  '2xl': '1536px', // Large desktop
};

// Tailwind responsive classes usage:
// sm:hidden - hide on mobile
// md:block - show on tablet+
// lg:grid-cols-3 - grid layout on desktop