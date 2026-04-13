import type { ClaideAPI } from '../../preload/index'

declare global {
  interface Window {
    claide: ClaideAPI
  }
}
