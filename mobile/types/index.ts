export type TransactionType = 'income' | 'expense';

export type Transaction = {
  uuid: string;
  type: TransactionType;
  amount: number;
  date: string;
  category: string;
  description: string | null;
};

export type TransactionFormData = {
  type: TransactionType;
  amount: number;
  date: string;
  category: string;
  description: string | null;
};

export type DrawerParamList = {
  Dashboard: undefined;
  Transaction: { transaction?: Transaction } | undefined;
  History: undefined;
};
