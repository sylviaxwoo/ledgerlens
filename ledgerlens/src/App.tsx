import { HashRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from './store'
import { DrillProvider } from './components/Drill'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ProjectRoi from './pages/ProjectRoi'
import DataQuality from './pages/DataQuality'
import Orders from './pages/Orders'
import Vouchers from './pages/Vouchers'
import Ledger from './pages/Ledger'
import Receivables from './pages/Receivables'
import Payables from './pages/Payables'
import SettingsPage from './pages/Settings'

function Shell() {
  const { lang } = useStore()
  return (
    <HashRouter key={lang}>
      <DrillProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="roi" element={<ProjectRoi />} />
            <Route path="quality" element={<DataQuality />} />
            <Route path="orders" element={<Orders />} />
            <Route path="vouchers" element={<Vouchers />} />
            <Route path="ledger" element={<Ledger />} />
            <Route path="ar" element={<Receivables />} />
            <Route path="ap" element={<Payables />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </DrillProvider>
    </HashRouter>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
