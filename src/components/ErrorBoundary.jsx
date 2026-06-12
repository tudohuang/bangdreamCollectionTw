import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="max-w-md mx-auto my-20 glass p-8 text-center">
          <div className="font-display font-bold text-lg text-dream-ink">這個區塊出了點狀況</div>
          <p className="text-[13px] text-dream-sub mt-2">可能是某筆資料格式異常。其他部分仍可使用。</p>
          <button
            className="pill mt-4"
            onClick={() => { this.setState({ error: null }); location.reload() }}
          >重新載入</button>
        </div>
      )
    }
    return this.props.children
  }
}
