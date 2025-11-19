import { ParsedData } from '@/types/dispatch';

export const generateExampleData = (): ParsedData => {
  const headers = ['Nome', 'Email', 'Telefone', 'Empresa', 'Cidade'];
  
  const firstNames = [
    'João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Juliana', 'Fernando', 'Beatriz',
    'Rafael', 'Camila', 'Lucas', 'Patricia', 'Gustavo', 'Fernanda', 'Ricardo',
    'Amanda', 'Marcelo', 'Carla', 'Rodrigo', 'Gabriela', 'Bruno', 'Tatiana',
    'Thiago', 'Renata', 'André', 'Mariana', 'Felipe', 'Vanessa', 'Diego', 'Cristina'
  ];
  
  const lastNames = [
    'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves',
    'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Rocha'
  ];
  
  const companies = [
    'Tech Solutions', 'Inovação Digital', 'Consultoria Plus', 'Marketing Pro',
    'Vendas Express', 'StartUp Hub', 'Business Group', 'Global Trade',
    'Smart Systems', 'Future Corp', 'Dynamic Solutions', 'Prime Consulting',
    'Elite Services', 'Vision Tech', 'Alpha Group', 'Beta Solutions'
  ];
  
  const cities = [
    'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília', 'Curitiba',
    'Porto Alegre', 'Salvador', 'Fortaleza', 'Recife', 'Manaus', 'Goiânia',
    'Campinas', 'São Bernardo', 'Santo André', 'Guarulhos', 'Florianópolis'
  ];
  
  const rows: Record<string, string>[] = [];
  
  for (let i = 0; i < 120; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${firstName} ${lastName}`;
    const emailName = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}`;
    const email = `${emailName}@exemplo.com.br`;
    const ddd = ['11', '21', '31', '41', '51', '85', '71'][Math.floor(Math.random() * 7)];
    const phone = `+55 ${ddd} 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const company = companies[Math.floor(Math.random() * companies.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    
    rows.push({
      Nome: fullName,
      Email: email,
      Telefone: phone,
      Empresa: company,
      Cidade: city,
    });
  }
  
  return { headers, rows };
};
