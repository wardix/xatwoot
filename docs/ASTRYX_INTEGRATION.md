# Astryx Design System Integration

**Meta's open-source design system - 160+ React components with StyleX**

## Daftar Singkat: Mengapa Pilih Astryx?

✅ **Open source** - Dapat digunakan secara bebas  
✅ **React 19+ compatible** - Cocok untuk frontend kita React 18/19  
✅ **StyleX powered** - Performa tinggi dengan CSS-in-JS yang dioptimalkan  
✅ **7 tema siap pakai** - Termasuk dark mode otomatis  
✅ **Agent-ready CLI** - Dokumentasi lengkap untuk developer  

---

## Instalasi

### 1. Install Package utama & Theme Pilihan

```bash
npm install @astryxdesign/core @astryxdesign/theme-neutral
# atau tema lain: theme-matcha, theme-stone, dll
```

### 2. Setup di Project

**src/index.css:**
```css
@import '@astryxdesign/core/reset.css';
@import '@astryxdesign/core/astryx.css';
@import '@astryxdesign/theme-neutral/theme.css'; /* pilih tema */
```

**src/main.tsx:**
```tsx
import { Theme } from '@astryxdesign/core';
import { neutralTheme } from '@astryxdesign/theme-neutral';

function App() {
  return (
    <Theme theme={neutralTheme}>
      <YourApp />
    </Theme>
  );
}
```

---

## Color Palette & Tokens

### Tema yang Tersedia

| Theme | Karakteristik | Cocok untuk |
|-------|---------------|-------------|
| **Neutral** | Warna netral, minimal | Produk enterprise |
| **Butter** | Emas + biru akcent | UI produktivitas |
| **Chocolate** | Brown hangat + beige | E-commerce |
| **Matcha** | Hijau bumi + Figtree | Fintech |
| **Stone** | Stone + slate toning | Dashboard |
| **Gothic** | Dark mode only | Gaming/Entertainment |
| **Y2K** | Periwinkle + holographic | Social media |

### Contoh Penggunaan Color Tokens

```tsx
import { Button } from '@astryxdesign/core/Button';

// Astryx menyediakan semantic tokens:
<Button 
  label="Primary Action" 
  variant="primary"  // menggunakan warna brand utama
/>

<Button 
  label="Destructive" 
  variant="danger"   // merah untuk aksi hapus
/>

// Custom color dengan StyleX:
const customStyles = stylex.create({
  primary: {
    backgroundColor: 'var(--color-accent)',  // token dari tema
    color: 'white',
  }
});
```

---

## Spacing System (8-point grid)

Astryx menggunakan spacing scale 0-12:

| Token | Pixel Value | Usage |
|-------|-------------|-------|
| `spacing.0` | 0px | - |
| `spacing.1` | 4px | Micro padding/margin |
| `spacing.2` | 8px | Small gaps |
| `spacing.3` | 12px | Component internal |
| `spacing.4` | 16px | Standard padding |
| `spacing.5` | 20px | Section gaps |
| `spacing.6` | 24px | Large sections |
| ... | ... | ... |
| `spacing.12` | 48px | Max container padding |

**Penggunaan di React:**
```tsx
import { VStack } from '@astryxdesign/core/Layout';

<VStack gap={3}>  {/* gap = 12px */}
  <Button label="First" />
  <Button label="Second" />
</VStack>
```

---

## Typography Scale

| Style | Font Size | Weight | Line Height | Usage |
|-------|-----------|--------|-------------|-------|
| `displayLarge` | 36px | 700 | 1.1 | Page titles |
| `displayMedium` | 28px | 700 | 1.1 | Section headers |
| `headlineLarge` | 24px | 600 | 1.2 | Card titles |
| `bodyLarge` | 18px | 500 | 1.5 | Labels, captions |
| `bodyMedium` | 16px | 400 | 1.5 | Default text |
| `bodySmall` | 14px | 400 | 1.4 | Secondary text |

---

## Component Library Integration

### Komponen yang Relevan untuk Chatwoot Clone:

```tsx
// Button - untuk aksi utama
<Button label="Send Message" variant="primary" />

// Input - untuk form pesan
<Input placeholder="Type your message..." clearable />

// Card - untuk conversation list items
<Card>
  <ConversationSummary />
</Card>

// Avatar - untuk contact/agent avatars
<Avatar src={contact.avatar_url} name={contact.name} size={40} />

// Badge - untuk status conversation
<Badge variant="status" text={conversation.status} />

// Dialog/Modal - untuk detail view
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <ConversationDetail />
</Dialog>
```

### Komponen Chat Spesifik yang Bisa Dibuat:

1. **MessageBubble** - Menggunakan Card + custom styling
2. **ChatInputBar** - Input + Button kombinasi  
3. **ContactList** - List dengan Avatar + VStack
4. **StatusIndicator** - Badge berwarna berdasarkan status

---

## Dark Mode Support

Astryx mendukung dark mode otomatis:

```tsx
import { Theme } from '@astryxdesign/core';
import { neutralTheme } from '@astryxdesign/theme-neutral';

function App() {
  return (
    <Theme theme={neutralTheme} mode="system"> {/* atau 'light' / 'dark' */}
      <YourApp />
    </Theme>
  );
}
```

### Token yang Berubah Sesuai Mode:

- `--color-background` → putih/gray-900
- `--color-text-primary` → gray-900/gray-100  
- `--color-surface` → gray-50/gray-800

---

## StyleX Override Pattern

Untuk custom styling tanpa kehilangan manfaat design system:

```tsx
import * as stylex from '@stylexjs/stylex';
import { Button } from '@astryxdesign/core/Button';

const styles = stylex.create({
  primaryButton: {
    backgroundColor: 'var(--color-brand)',
    borderRadius: 'var(--radius-full)',
    '&:hover': {
      opacity: 0.9,
    },
  }
});

// Penggunaan
<Button label="Custom" xstyle={styles.primaryButton} />
```

---

## CLI Tools yang Berguna

```bash
# Lihat semua komponen
npx astryx component --list

# Dokumentasi komponen spesifik  
npx astryx component Button

# Semua tokens
npx astryx docs tokens

# Build theme custom untuk production
npx astryx theme build ./src/themes/custom.ts
```

---

## Migration dari Tailwind CSS (Opsional)

Jika ingin migrasi bertahap:

1. **Instal dulu Astryx:**
   ```bash
   npm install @astryxdesign/core @astryxdesign/theme-neutral
   ```

2. **Setup Theme Provider** di root component

3. **Ganti komponen utama:**
   - `button className="btn-primary"` → `<Button label="..." variant="primary" />`
   - `div className="card"` → `<Card>...</Card>`

4. **Custom styling tetap bisa pakai Tailwind utilities** karena tidak ada lock-in

---

## Resources

- 📚 [Dokumentasi Resmi](https://astryx.atmeta.com/)
- 🧪 [Storybook](https://facebook.github.io/astryx/storybook/)  
- 💻 [GitHub Repository](https://github.com/facebook/astryx)
- 🎯 [Theme Docs](https://astryx.atmeta.com/docs/theme)
- 🎨 [Tokens Reference](https://astryx.atmeta.com/docs/tokens)