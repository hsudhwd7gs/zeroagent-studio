/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    // Disabled for hosted builds — avoids publishing key-handling logic via .map files.
    sourcemap: false,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/**/*.css',
        'src/components/edges/**',
        'src/components/nodes/AgentNode.tsx',
        'src/components/nodes/ChatNode.tsx',
        'src/components/nodes/ToolNode.tsx',
        'src/components/nodes/NodeActionBar.tsx',
        'src/components/canvas/FlowCanvas.tsx',
        'src/components/canvas/CanvasHintBar.tsx',
        'src/components/header/Header.tsx',
        'src/components/sidebar/NodePalette.tsx',
        'src/components/sidebar/PaletteAccordionSection.tsx',
        'src/components/inspector/NodeInspector.tsx',
        'src/components/inspector/EdgeInspector.tsx',
        'src/components/inspector/ToolInspectorFields.tsx',
        'src/components/inspector/ToolSafetyNotice.tsx',
        'src/components/inspector/InspectorSetupNotice.tsx',
        'src/components/inspector/BaseInspectorShell.tsx',
        'src/components/inspector/PortLegend.tsx',
        'src/components/nodes/PortHandles.tsx',
        'src/components/settings/SettingsPanel.tsx',
        'src/components/settings/CloudPrivacyGuide.tsx',
        'src/components/settings/ModelLoadBanner.tsx',
        'src/components/debugger/DebugTerminal.tsx',
        'src/components/onboarding/WelcomeBanner.tsx',
        'src/components/dialog/ConfirmDialog.tsx',
        'src/stores/connectionStore.ts',
        'src/components/tutorial/**',
        'src/components/guide/**',
        'src/App.tsx',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
})
