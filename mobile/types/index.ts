export type TransactionType = 'income' | 'expense';

export type Transaction = {
  uuid: string;
  type: TransactionType;
  amount: number;
  date: string;
  category: string;
  description: string | null;
  installment_total: number | null;
  installment_number: number | null;
  installment_group: string | null;
};

export type TransactionFormData = {
  type: TransactionType;
  amount: number;
  date: string;
  category: string;
  description: string | null;
  installments?: number | null;
};

export type DrawerParamList = {
  Dashboard: undefined;
  Transaction: { transaction?: Transaction } | undefined;
  History: undefined;
};
