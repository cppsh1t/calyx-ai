export type Option<T> = 
  | { type: "Some"; value: T }
  | { type: "None" };

