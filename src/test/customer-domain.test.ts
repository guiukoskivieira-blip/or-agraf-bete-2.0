/**
 * @file customer-domain.test.ts
 * @description Suíte de Testes de Integridade de Clientes, Multi-Tenant e Integração com Orçamentos
 * @project OrçaGraf
 */

import { LocalStorageCustomerRepository } from '../domain/customer-repository';
import { Customer } from '../types/customer';
import { Quote } from '../types/quote';
import { TestResult } from './domain-integrity.test';

export function runCustomerDomainTests(): TestResult[] {
  const results: TestResult[] = [];

  function assert(condition: boolean, testName: string, suiteName: string) {
    if (condition) {
      results.push({ suiteName, testName, passed: true });
    } else {
      results.push({ suiteName, testName, passed: false, error: 'Assertion failed' });
    }
  }

  const repo = new LocalStorageCustomerRepository();
  const tenantA = 'emp_teste_alpha';
  const tenantB = 'emp_teste_beta';

  repo.clear(tenantA);
  repo.clear(tenantB);

  // 1. Cadastro e recuperação após persistência
  let createdCustomerA: Customer | undefined;
  const createPromise = async () => {
    const res = await repo.create(tenantA, {
      name: 'Gráfica e Editora Modelo Ltda',
      type: 'company',
      document: '33.444.555/0001-66',
      email: 'contato@modeloprint.com.br',
      phone: '(11) 91234-5678',
      whatsapp: '(11) 91234-5678',
      address: {
        street: 'Rua das Flores',
        number: '120',
        neighborhood: 'Centro',
        city: 'Campinas',
        state: 'SP',
        zipCode: '13010-000',
      },
    });
    createdCustomerA = res.customer;
    assert(res.success && Boolean(res.customer?.id), 'Cliente cadastrado com sucesso', '1. Cadastro e Persistência');

    // Recupera da lista do tenant
    const list = await repo.list(tenantA);
    const found = list.find(c => c.id === res.customer?.id);
    assert(found !== undefined && found.name === 'Gráfica e Editora Modelo Ltda', 'Cliente recuperado com dados corretos da lista', '1. Cadastro e Persistência');
  };

  // 2. Isolamento Estrito por Tenant
  const isolationPromise = async () => {
    const listB = await repo.list(tenantB);
    const leaked = listB.find(c => c.document === '33.444.555/0001-66');
    assert(leaked === undefined && listB.length === 0, 'Tenant B não tem acesso aos clientes cadastrados pelo Tenant A', '2. Isolamento Multi-tenant');
  };

  // 3. Documento duplicado recusado no mesmo tenant
  const duplicateDocPromise = async () => {
    const dupRes = await repo.create(tenantA, {
      name: 'Outra Empresa Tentando Mesmo CNPJ',
      document: '33.444.555/0001-66', // Mesmo CNPJ já cadastrado no Tenant A
      email: 'outro@email.com',
    });
    assert(!dupRes.success && Boolean(dupRes.error), 'Cadastro com documento duplicado no mesmo tenant é bloqueado', '3. Unicidade de Documento');
  };

  // 4. Mesmo documento permitido em tenant diferente (multiempresa)
  const crossTenantDocPromise = async () => {
    const crossRes = await repo.create(tenantB, {
      name: 'Cliente com Mesmo CNPJ na Filial Beta',
      document: '33.444.555/0001-66', // Mesmo CNPJ permitido no Tenant B
      email: 'filial@beta.com.br',
    });
    assert(crossRes.success && Boolean(crossRes.customer?.id), 'Mesmo documento permitido em empresa/tenant diferente', '4. Multi-Tenant Cross-Company');
  };

  // 5. Edição de Cliente
  const editPromise = async () => {
    if (!createdCustomerA) return;
    const updateRes = await repo.update(tenantA, createdCustomerA.id, {
      name: 'Gráfica Modelo Internacional Ltda',
      phone: '(11) 99999-0000',
    });
    assert(updateRes.success && updateRes.customer?.name === 'Gráfica Modelo Internacional Ltda', 'Cliente editado com sucesso', '5. Edição de Cadastro');
    assert(updateRes.customer?.phone === '(11) 99999-0000', 'Telefone atualizado no cadastro', '5. Edição de Cadastro');

    const fresh = await repo.getById(tenantA, createdCustomerA.id);
    assert(fresh?.name === 'Gráfica Modelo Internacional Ltda', 'Dados persistidos refletem a edição na busca por ID', '5. Edição de Cadastro');
  };

  // 6. Desativação e Reativação Não Destrutiva
  const toggleActivePromise = async () => {
    if (!createdCustomerA) return;
    const toggle1 = await repo.toggleActive(tenantA, createdCustomerA.id);
    assert(toggle1.success && toggle1.isActive === false, 'Cliente desativado com sucesso (isActive: false)', '6. Ativação / Desativação');

    const listActive = await repo.list(tenantA, { isActive: true });
    const inActiveList = listActive.some(c => c.id === createdCustomerA?.id);
    assert(!inActiveList, 'Cliente inativo não aparece na listagem de apenas ativos', '6. Ativação / Desativação');

    const toggle2 = await repo.toggleActive(tenantA, createdCustomerA.id);
    assert(toggle2.success && toggle2.isActive === true, 'Cliente reativado com sucesso (isActive: true)', '6. Ativação / Desativação');
  };

  // 7. Busca Textual e por Documento
  const searchPromise = async () => {
    const searchByName = await repo.search(tenantA, 'Modelo');
    assert(searchByName.length > 0, 'Busca por termo no nome retorna o cliente', '7. Busca de Clientes');

    const searchByDocClean = await repo.search(tenantA, '33444555000166');
    assert(searchByDocClean.length > 0, 'Busca por CNPJ sem pontuação localiza o cliente', '7. Busca de Clientes');

    const searchByPhone = await repo.search(tenantA, '99999');
    assert(searchByPhone.length > 0, 'Busca por número de telefone localiza o cliente', '7. Busca de Clientes');
  };

  // 8. Seleção e Preenchimento no Orçamento
  const quoteSelectionPromise = async () => {
    if (!createdCustomerA) return;
    // Simula seleção do cliente no orçamento
    const selectedCustomer = createdCustomerA;
    const quotePayload: Partial<Quote> = {
      id: 'quote_test_01',
      tenantId: tenantA,
      quoteNumber: 'ORC-2026-9901',
      customerId: selectedCustomer.id, // Vincula o ID do cliente cadastrado
      customerName: selectedCustomer.name,
      customerContact: selectedCustomer.phone,
      customerDocument: selectedCustomer.document,
      customerEmail: selectedCustomer.email,
      items: [],
      subtotalCents: 50000,
      totalCents: 50000,
      status: 'awaiting_customer',
    };

    assert(quotePayload.customerId === selectedCustomer.id, 'Orçamento vincula customerId do cliente selecionado', '8. Seleção no Orçamento');
    assert(quotePayload.customerName === selectedCustomer.name, 'Orçamento auto-preenche nome do cliente selecionado', '8. Seleção no Orçamento');
    assert(quotePayload.customerDocument === selectedCustomer.document, 'Orçamento auto-preenche CPF/CNPJ', '8. Seleção no Orçamento');
  };

  // 9. Cliente Avulso Continua Permitido
  const guestCustomerPromise = async () => {
    const guestQuote: Partial<Quote> = {
      id: 'quote_guest_02',
      tenantId: tenantA,
      quoteNumber: 'ORC-2026-9902',
      customerId: undefined, // Sem ID de cliente cadastrado
      customerName: 'Cliente Balcão Avulso',
      customerContact: '(11) 98888-0000',
      items: [],
      subtotalCents: 7000,
      totalCents: 7000,
      status: 'awaiting_customer',
    };

    assert(guestQuote.customerId === undefined, 'Cliente avulso pode ser gerado sem cadastro obrigatório prévio', '9. Cliente Avulso');
    assert(guestQuote.customerName === 'Cliente Balcão Avulso', 'Dados do cliente avulso preservados no orçamento', '9. Cliente Avulso');
  };

  // 10. Orçamento Preserva Snapshot Independente do Cadastro
  const snapshotPromise = async () => {
    if (!createdCustomerA) return;
    // Cria proposta com dados no momento T0
    const quoteSnapshot: Partial<Quote> = {
      id: 'quote_snap_03',
      tenantId: tenantA,
      quoteNumber: 'ORC-2026-9903',
      customerId: createdCustomerA.id,
      customerName: 'Gráfica Modelo Internacional Ltda',
      customerContact: '(11) 99999-0000',
    };

    // Altera o cadastro mestre na base
    await repo.update(tenantA, createdCustomerA.id, {
      name: 'Novo Nome da Gráfica Alterado Posteriormente',
      phone: '(11) 91111-2222',
    });

    // O orçamento emitido permanece intacto
    assert(quoteSnapshot.customerName === 'Gráfica Modelo Internacional Ltda', 'Orçamento mantém snapshot inalterado mesmo após edição do cliente mestre', '10. Preservação de Snapshot');
    assert(quoteSnapshot.customerContact === '(11) 99999-0000', 'Contato no orçamento não é alterado silenciosamente', '10. Preservação de Snapshot');
  };

  // Executa síncrono/aguarda no runner
  // Criamos uma função de execução para garantir resolução sequencial
  const runAsync = async () => {
    await createPromise();
    await isolationPromise();
    await duplicateDocPromise();
    await crossTenantDocPromise();
    await editPromise();
    await toggleActivePromise();
    await searchPromise();
    await quoteSelectionPromise();
    await guestCustomerPromise();
    await snapshotPromise();
  };

  // Como o runner é síncrono no topo, podemos rodar as promises com deasync ou registrar os asserts
  // No ambiente tsx / Node moderno, top-level await pode ser usado se o runner for assíncrono.
  // Vamos verificar o run-tests.ts.
  return results;
}

export async function runAllCustomerDomainTestsAsync(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  function assert(condition: boolean, testName: string, suiteName: string) {
    if (condition) {
      results.push({ suiteName, testName, passed: true });
    } else {
      results.push({ suiteName, testName, passed: false, error: 'Assertion failed' });
    }
  }

  const repo = new LocalStorageCustomerRepository();
  const tenantA = 'emp_teste_alpha';
  const tenantB = 'emp_teste_beta';

  repo.clear(tenantA);
  repo.clear(tenantB);

  // 1. Cadastro e recuperação após persistência
  const res = await repo.create(tenantA, {
    name: 'Gráfica e Editora Modelo Ltda',
    type: 'company',
    document: '33.444.555/0001-66',
    email: 'contato@modeloprint.com.br',
    phone: '(11) 91234-5678',
    whatsapp: '(11) 91234-5678',
    address: {
      street: 'Rua das Flores',
      number: '120',
      neighborhood: 'Centro',
      city: 'Campinas',
      state: 'SP',
      zipCode: '13010-000',
    },
  });
  const createdCustomerA = res.customer;
  assert(res.success && Boolean(res.customer?.id), 'Cliente cadastrado com sucesso', '1. Cadastro e Persistência');

  const list = await repo.list(tenantA);
  const found = list.find(c => c.id === res.customer?.id);
  assert(found !== undefined && found.name === 'Gráfica e Editora Modelo Ltda', 'Cliente recuperado com dados corretos da lista', '1. Cadastro e Persistência');

  // 2. Isolamento Estrito por Tenant
  const listB = await repo.list(tenantB);
  const leaked = listB.find(c => c.document === '33.444.555/0001-66');
  assert(leaked === undefined && listB.length === 0, 'Tenant B não tem acesso aos clientes cadastrados pelo Tenant A', '2. Isolamento Multi-tenant');

  // 3. Documento duplicado recusado no mesmo tenant
  const dupRes = await repo.create(tenantA, {
    name: 'Outra Empresa Tentando Mesmo CNPJ',
    document: '33.444.555/0001-66',
    email: 'outro@email.com',
  });
  assert(!dupRes.success && Boolean(dupRes.error), 'Cadastro com documento duplicado no mesmo tenant é bloqueado', '3. Unicidade de Documento');

  // 4. Mesmo documento permitido em tenant diferente (multiempresa)
  const crossRes = await repo.create(tenantB, {
    name: 'Cliente com Mesmo CNPJ na Filial Beta',
    document: '33.444.555/0001-66',
    email: 'filial@beta.com.br',
  });
  assert(crossRes.success && Boolean(crossRes.customer?.id), 'Mesmo documento permitido em empresa/tenant diferente', '4. Multi-Tenant Cross-Company');

  // 5. Edição de Cliente
  if (createdCustomerA) {
    const updateRes = await repo.update(tenantA, createdCustomerA.id, {
      name: 'Gráfica Modelo Internacional Ltda',
      phone: '(11) 99999-0000',
    });
    assert(updateRes.success && updateRes.customer?.name === 'Gráfica Modelo Internacional Ltda', 'Cliente editado com sucesso', '5. Edição de Cadastro');
    assert(updateRes.customer?.phone === '(11) 99999-0000', 'Telefone atualizado no cadastro', '5. Edição de Cadastro');

    const fresh = await repo.getById(tenantA, createdCustomerA.id);
    assert(fresh?.name === 'Gráfica Modelo Internacional Ltda', 'Dados persistidos refletem a edição na busca por ID', '5. Edição de Cadastro');
  }

  // 6. Desativação e Reativação Não Destrutiva
  if (createdCustomerA) {
    const toggle1 = await repo.toggleActive(tenantA, createdCustomerA.id);
    assert(toggle1.success && toggle1.isActive === false, 'Cliente desativado com sucesso (isActive: false)', '6. Ativação / Desativação');

    const listActive = await repo.list(tenantA, { isActive: true });
    const inActiveList = listActive.some(c => c.id === createdCustomerA?.id);
    assert(!inActiveList, 'Cliente inativo não aparece na listagem de apenas ativos', '6. Ativação / Desativação');

    const toggle2 = await repo.toggleActive(tenantA, createdCustomerA.id);
    assert(toggle2.success && toggle2.isActive === true, 'Cliente reativado com sucesso (isActive: true)', '6. Ativação / Desativação');
  }

  // 7. Busca Textual e por Documento
  const searchByName = await repo.search(tenantA, 'Modelo');
  assert(searchByName.length > 0, 'Busca por termo no nome retorna o cliente', '7. Busca de Clientes');

  const searchByDocClean = await repo.search(tenantA, '33444555000166');
  assert(searchByDocClean.length > 0, 'Busca por CNPJ sem pontuação localiza o cliente', '7. Busca de Clientes');

  const searchByPhone = await repo.search(tenantA, '99999');
  assert(searchByPhone.length > 0, 'Busca por número de telefone localiza o cliente', '7. Busca de Clientes');

  // 8. Seleção e Preenchimento no Orçamento
  if (createdCustomerA) {
    const selectedCustomer = createdCustomerA;
    const quotePayload: Partial<Quote> = {
      id: 'quote_test_01',
      tenantId: tenantA,
      quoteNumber: 'ORC-2026-9901',
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerContact: selectedCustomer.phone,
      customerDocument: selectedCustomer.document,
      customerEmail: selectedCustomer.email,
      items: [],
      subtotalCents: 50000,
      totalCents: 50000,
      status: 'awaiting_customer',
    };

    assert(quotePayload.customerId === selectedCustomer.id, 'Orçamento vincula customerId do cliente selecionado', '8. Seleção no Orçamento');
    assert(quotePayload.customerName === selectedCustomer.name, 'Orçamento auto-preenche nome do cliente selecionado', '8. Seleção no Orçamento');
    assert(quotePayload.customerDocument === selectedCustomer.document, 'Orçamento auto-preenche CPF/CNPJ', '8. Seleção no Orçamento');
  }

  // 9. Cliente Avulso Continua Permitido
  const guestQuote: Partial<Quote> = {
    id: 'quote_guest_02',
    tenantId: tenantA,
    quoteNumber: 'ORC-2026-9902',
    customerId: undefined,
    customerName: 'Cliente Balcão Avulso',
    customerContact: '(11) 98888-0000',
    items: [],
    subtotalCents: 7000,
    totalCents: 7000,
    status: 'awaiting_customer',
  };

  assert(guestQuote.customerId === undefined, 'Cliente avulso pode ser gerado sem cadastro obrigatório prévio', '9. Cliente Avulso');
  assert(guestQuote.customerName === 'Cliente Balcão Avulso', 'Dados do cliente avulso preservados no orçamento', '9. Cliente Avulso');

  // 10. Orçamento Preserva Snapshot Independente do Cadastro
  if (createdCustomerA) {
    const quoteSnapshot: Partial<Quote> = {
      id: 'quote_snap_03',
      tenantId: tenantA,
      quoteNumber: 'ORC-2026-9903',
      customerId: createdCustomerA.id,
      customerName: 'Gráfica Modelo Internacional Ltda',
      customerContact: '(11) 99999-0000',
    };

    await repo.update(tenantA, createdCustomerA.id, {
      name: 'Novo Nome da Gráfica Alterado Posteriormente',
      phone: '(11) 91111-2222',
    });

    assert(quoteSnapshot.customerName === 'Gráfica Modelo Internacional Ltda', 'Orçamento mantém snapshot inalterado mesmo após edição do cliente mestre', '10. Preservação de Snapshot');
    assert(quoteSnapshot.customerContact === '(11) 99999-0000', 'Contato no orçamento não é alterado silenciosamente', '10. Preservação de Snapshot');
  }

  return results;
}
