export interface Message {
  text: string
  subject?: string
  timestamp?: number
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray'
}
