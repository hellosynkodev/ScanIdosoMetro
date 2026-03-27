export type Documento = {
  nome: string;
  dataNascimento: string; // ISO como 1940-05-12
  cpf: string;
  idosoId: string;
  validadeCartaoIdoso: string; // ISO
};

export type ResultadoValidacao = {
  idoso: boolean;
  idade: number;
  cartaoOk: boolean;
  motivo: string;
};
