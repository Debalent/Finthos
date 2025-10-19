// client/services/transactionService.js

const mockTransactions = [
  { id: 1, type: 'Sent', to: 'John Doe', amount: 50, date: '2025-09-27' },
  { id: 2, type: 'Received', from: 'Community Fund', amount: 100, date: '2025-09-26' },
];

export function getTransactions() {
  return Promise.resolve(mockTransactions);
}

export function sendMoney({ to, amount, note }) {
  console.log(`Sending $${amount} to ${to}: ${note}`);
  return Promise.resolve({ success: true });
}

export function requestMoney({ from, amount, note }) {
  console.log(`Requesting $${amount} from ${from}: ${note}`);
  return Promise.resolve({ success: true });
}
