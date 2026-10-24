import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// 申请持久化存储：降低被浏览器回收的概率。
// Safari 基本不会批准，但调用本身无害；真正的兜底是设置页的导出备份。
if (navigator.storage?.persist) {
  void navigator.storage.persist().catch(() => undefined)
}

const container = document.getElementById('root')
if (!container) throw new Error('缺少 #root 挂载点')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
