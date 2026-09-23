/**
 * Seed de desenvolvimento — ATENÇÃO: apaga os dados existentes e recria tudo.
 * Rode com:  npm run db:seed   (na raiz do projeto)
 */
import { PrismaClient, type OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const img = (id: string, w = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@rafaellacakes.com.br';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Rafaella@2026';
const CUSTOMER_EMAIL = 'cliente@exemplo.com';
const CUSTOMER_PASSWORD = 'Cliente@2026';

type V = { name: string; size?: string; flavor?: string; price: number; stock?: number | null };
type P = {
  name: string;
  slug: string;
  category: string;
  short: string;
  description: string;
  featured?: boolean;
  lead?: number;
  images: [string, string][]; // [unsplashId, alt]
  variants: V[];
};

const categories = [
  { name: 'Bolos', slug: 'bolos', description: 'Bolos artesanais para celebrar qualquer momento.', image: 'photo-1578985545062-69928b1d9587' },
  { name: 'Doces Finos', slug: 'doces-finos', description: 'Brigadeiros gourmet, bem-casados e bombons feitos à mão.', image: 'photo-1569864358642-9d1684040f43' },
  { name: 'Tortas', slug: 'tortas', description: 'Tortas doces com massa amanteigada e recheios generosos.', image: 'photo-1519869325930-281384150729' },
  { name: 'Cupcakes', slug: 'cupcakes', description: 'Cupcakes fofinhos com coberturas delicadas.', image: 'photo-1587314168485-3236d6710814' },
  { name: 'Sobremesas', slug: 'sobremesas', description: 'Pudins, pavês e sobremesas no pote.', image: 'photo-1571877227200-a0d98ea607e9' },
  { name: 'Salgados', slug: 'salgados', description: 'Salgadinhos e quiches para acompanhar a festa.', image: 'photo-1555507036-ab1f4038808a' },
];

const products: P[] = [
  // ---------------- Bolos ----------------
  {
    name: 'Bolo Floresta Negra',
    slug: 'bolo-floresta-negra',
    category: 'bolos',
    short: 'Massa de chocolate, chantilly fresco e cerejas ao licor.',
    description:
      'Clássico alemão na versão da Rafaella: camadas de pão de ló de chocolate umedecidas com calda de cereja, chantilly batido na hora e cerejas marinadas. Finalizado com raspas de chocolate meio amargo.\n\nConservar refrigerado e consumir em até 3 dias.',
    featured: true,
    images: [
      ['photo-1578985545062-69928b1d9587', 'Bolo Floresta Negra com cobertura de chocolate e cerejas'],
      ['photo-1563729784474-d77dbb933a9e', 'Fatia de bolo de chocolate com recheio cremoso'],
    ],
    variants: [
      { name: 'Pequeno · 10 fatias', size: 'Pequeno (15 cm)', price: 12000 },
      { name: 'Médio · 20 fatias', size: 'Médio (20 cm)', price: 19000 },
      { name: 'Grande · 30 fatias', size: 'Grande (25 cm)', price: 26000 },
    ],
  },
  {
    name: 'Bolo de Chocolate Belga com Morangos',
    slug: 'bolo-chocolate-belga-morangos',
    category: 'bolos',
    short: 'Ganache de chocolate belga 54% e morangos frescos.',
    description:
      'Massa úmida de cacau, recheio duplo de ganache de chocolate belga e brigadeiro cremoso, coberto com morangos selecionados. Um dos queridinhos da casa!',
    featured: true,
    images: [
      ['photo-1586985289688-ca3cf47d3e6e', 'Bolo de chocolate coberto com morangos frescos'],
      ['photo-1606890737304-57a1ca8a5b62', 'Detalhe da cobertura de ganache e morangos'],
    ],
    variants: [
      { name: 'Pequeno · 10 fatias', size: 'Pequeno (15 cm)', flavor: 'Chocolate belga', price: 13000 },
      { name: 'Médio · 20 fatias', size: 'Médio (20 cm)', flavor: 'Chocolate belga', price: 21000 },
      { name: 'Grande · 30 fatias', size: 'Grande (25 cm)', flavor: 'Chocolate belga', price: 29000 },
    ],
  },
  {
    name: 'Naked Cake de Frutas Vermelhas',
    slug: 'naked-cake-frutas-vermelhas',
    category: 'bolos',
    short: 'Massa de baunilha, creme de mascarpone e frutas vermelhas.',
    description:
      'Perfeito para casamentos e festas ao ar livre. Massa leve de baunilha com fava, creme de mascarpone e geleia artesanal de frutas vermelhas. Decorado com frutas frescas e flores comestíveis.',
    featured: true,
    lead: 3,
    images: [
      ['photo-1535141192574-5d4897c12636', 'Naked cake decorado com frutas vermelhas e flores'],
      ['photo-1464349095431-e9a21285b5f3', 'Bolo de festa com decoração delicada'],
    ],
    variants: [
      { name: 'Médio · 20 fatias', size: 'Médio (20 cm)', flavor: 'Baunilha', price: 22000 },
      { name: 'Grande · 35 fatias', size: 'Grande (25 cm, 2 andares)', flavor: 'Baunilha', price: 31000 },
    ],
  },
  {
    name: 'Bolo Red Velvet',
    slug: 'bolo-red-velvet',
    category: 'bolos',
    short: 'Massa aveludada com toque de cacau e cream cheese.',
    description: 'A massa vermelha e macia mais famosa do mundo, intercalada com frosting de cream cheese na medida certa de doçura.',
    images: [
      ['photo-1586788680434-30d324b2d46f', 'Bolo red velvet com cobertura branca de cream cheese'],
      ['photo-1464305795204-6f5bbfc7fb81', 'Fatia de bolo com camadas de recheio'],
    ],
    variants: [
      { name: 'Pequeno · 10 fatias', size: 'Pequeno (15 cm)', flavor: 'Red velvet', price: 14000 },
      { name: 'Médio · 20 fatias', size: 'Médio (20 cm)', flavor: 'Red velvet', price: 22000 },
    ],
  },
  {
    name: 'Bolo de Cenoura com Brigadeiro',
    slug: 'bolo-cenoura-brigadeiro',
    category: 'bolos',
    short: 'O bolo da vó, com cobertura generosa de brigadeiro.',
    description: 'Bolo caseiro de cenoura, fofinho, com cobertura de brigadeiro cremoso e granulado belga. Pronta entrega enquanto durar o estoque!',
    images: [['photo-1571115177098-24ec42ed204d', 'Bolo caseiro com cobertura de chocolate']],
    variants: [{ name: 'Forma redonda · 12 fatias', size: 'Único', price: 6500, stock: 8 }],
  },
  {
    name: 'Bolo de Nozes com Doce de Leite',
    slug: 'bolo-nozes-doce-de-leite',
    category: 'bolos',
    short: 'Pão de ló de nozes, doce de leite artesanal e chantilly.',
    description: 'Camadas de pão de ló de nozes, doce de leite cremoso e chantilly. Decorado com nozes caramelizadas.',
    images: [['photo-1542826438-bd32f43d626f', 'Bolo com cobertura clara e decoração de flores']],
    variants: [
      { name: 'Pequeno · 10 fatias', size: 'Pequeno (15 cm)', price: 13500 },
      { name: 'Médio · 20 fatias', size: 'Médio (20 cm)', price: 21500 },
    ],
  },
  // ---------------- Doces finos ----------------
  {
    name: 'Brigadeiro Gourmet',
    slug: 'brigadeiro-gourmet',
    category: 'doces-finos',
    short: 'Feito com chocolate belga e finalizado à mão.',
    description:
      'Sabores: tradicional, pistache, ninho com Nutella, maracujá e café. Na caixa sortida enviamos um pouco de cada — se preferir um sabor específico, avise nas observações.',
    featured: true,
    images: [
      ['photo-1606313564200-e75d5e30476c', 'Brigadeiros gourmet em forminhas'],
      ['photo-1548907040-4baa42d10919', 'Doces de chocolate artesanais'],
    ],
    variants: [
      { name: 'Caixa com 12', size: '12 unidades', flavor: 'Sortidos', price: 4800 },
      { name: 'Caixa com 25', size: '25 unidades', flavor: 'Sortidos', price: 9500 },
      { name: 'Caixa com 50', size: '50 unidades', flavor: 'Sortidos', price: 18000 },
    ],
  },
  {
    name: 'Bem-casado Tradicional',
    slug: 'bem-casado-tradicional',
    category: 'doces-finos',
    short: 'Pão de ló delicado com doce de leite, embalado para presentear.',
    description:
      'O doce símbolo da felicidade dos noivos. Embalados individualmente com papel crepom e fita de cetim na cor da sua festa (informe nas observações).',
    lead: 5,
    images: [['photo-1558326567-98ae2405596b', 'Doces finos embalados para festa']],
    variants: [
      { name: '20 unidades', size: '20 unidades', flavor: 'Doce de leite', price: 9000 },
      { name: '50 unidades', size: '50 unidades', flavor: 'Doce de leite', price: 21000 },
      { name: '100 unidades', size: '100 unidades', flavor: 'Doce de leite', price: 40000 },
    ],
  },
  {
    name: 'Macarons Franceses',
    slug: 'macarons-franceses',
    category: 'doces-finos',
    short: 'Casquinha crocante e recheio cremoso em sabores delicados.',
    description: 'Sabores da estação: framboesa, pistache, limão siciliano, chocolate e baunilha. Ótimos para presentear.',
    featured: true,
    images: [
      ['photo-1569864358642-9d1684040f43', 'Macarons coloridos enfileirados'],
      ['photo-1558024920-b41e1887dc32', 'Macarons em tons pastel'],
    ],
    variants: [
      { name: 'Caixa com 6', size: '6 unidades', flavor: 'Sortidos', price: 4200, stock: 15 },
      { name: 'Caixa com 12', size: '12 unidades', flavor: 'Sortidos', price: 7800, stock: 10 },
    ],
  },
  {
    name: 'Trufas de Chocolate',
    slug: 'trufas-de-chocolate',
    category: 'doces-finos',
    short: 'Ganache aveludada banhada em chocolate meio amargo.',
    description: 'Trufas clássicas, de maracujá e de avelã. Embaladas em caixa kraft com laço.',
    images: [['photo-1548907040-4baa42d10919', 'Trufas de chocolate artesanais']],
    variants: [{ name: 'Caixa com 9', size: '9 unidades', flavor: 'Sortidas', price: 4500, stock: 20 }],
  },
  {
    name: 'Camafeu de Nozes',
    slug: 'camafeu-de-nozes',
    category: 'doces-finos',
    short: 'Doce fino de nozes com fondant e meia noz.',
    description: 'Tradicional em casamentos e festas elegantes. Mínimo de 25 unidades.',
    lead: 4,
    images: [['photo-1587668178277-295251f900ce', 'Doces finos em forminhas decoradas']],
    variants: [{ name: '25 unidades', size: '25 unidades', price: 11000 }],
  },
  // ---------------- Tortas ----------------
  {
    name: 'Torta de Limão Siciliano',
    slug: 'torta-limao-siciliano',
    category: 'tortas',
    short: 'Massa sablée, creme de limão e merengue maçaricado.',
    description: 'Equilíbrio perfeito entre o azedinho do limão siciliano e a doçura do merengue suíço tostado na hora.',
    featured: true,
    images: [['photo-1519915028121-7d3463d20b13', 'Torta de limão com merengue tostado']],
    variants: [
      { name: 'Pequena · 8 fatias', size: 'Pequena (18 cm)', price: 8500 },
      { name: 'Grande · 14 fatias', size: 'Grande (24 cm)', price: 14000 },
    ],
  },
  {
    name: 'Torta Holandesa',
    slug: 'torta-holandesa',
    category: 'tortas',
    short: 'Creme leve de baunilha, base de biscoito e ganache.',
    description: 'Creme holandês aerado sobre base crocante de biscoito amanteigado, cobertura de ganache e biscoitos de chocolate.',
    images: [['photo-1565958011703-44f9829ba187', 'Torta cremosa com cobertura de chocolate']],
    variants: [
      { name: 'Pequena · 8 fatias', size: 'Pequena (18 cm)', price: 9500 },
      { name: 'Grande · 14 fatias', size: 'Grande (24 cm)', price: 15000 },
    ],
  },
  {
    name: 'Cheesecake de Frutas Vermelhas',
    slug: 'cheesecake-frutas-vermelhas',
    category: 'tortas',
    short: 'Cheesecake cremoso estilo New York com calda de frutas.',
    description: 'Assado lentamente em banho-maria para ficar super cremoso. Calda artesanal de morango, framboesa e amora.',
    images: [
      ['photo-1533134242443-d4fd215305ad', 'Cheesecake com calda de frutas vermelhas'],
      ['photo-1488477181946-6428a0291777', 'Frutas vermelhas frescas sobre sobremesa'],
    ],
    variants: [
      { name: 'Fatia', size: 'Fatia individual', price: 1800, stock: 12 },
      { name: 'Inteira · 12 fatias', size: 'Inteira (22 cm)', price: 16000 },
    ],
  },
  {
    name: 'Torta de Morango com Chantilly',
    slug: 'torta-morango-chantilly',
    category: 'tortas',
    short: 'Creme de confeiteiro, morangos frescos e chantilly.',
    description: 'Massa podre amanteigada, creme de confeiteiro com baunilha e muitos morangos frescos.',
    images: [['photo-1464305795204-6f5bbfc7fb81', 'Torta decorada com morangos']],
    variants: [{ name: 'Inteira · 12 fatias', size: 'Inteira (24 cm)', price: 14500 }],
  },
  // ---------------- Cupcakes ----------------
  {
    name: 'Cupcakes Sortidos',
    slug: 'cupcakes-sortidos',
    category: 'cupcakes',
    short: 'Baunilha, chocolate e red velvet com buttercream.',
    description: 'Mix de sabores com coberturas em tons pastel. Podemos personalizar as cores para a sua festa (informe nas observações).',
    images: [
      ['photo-1587314168485-3236d6710814', 'Cupcakes com cobertura cor-de-rosa'],
      ['photo-1559620192-032c4bc4674e', 'Cupcakes decorados em uma bandeja'],
    ],
    variants: [
      { name: 'Caixa com 6', size: '6 unidades', flavor: 'Sortidos', price: 6000 },
      { name: 'Caixa com 12', size: '12 unidades', flavor: 'Sortidos', price: 11000 },
    ],
  },
  {
    name: 'Cupcake Red Velvet',
    slug: 'cupcake-red-velvet',
    category: 'cupcakes',
    short: 'Massa red velvet e frosting de cream cheese.',
    description: 'A versão individual do nosso red velvet, perfeita para presentear.',
    images: [['photo-1614707267537-b85aaf00c4b7', 'Cupcake red velvet com cobertura branca']],
    variants: [{ name: 'Caixa com 6', size: '6 unidades', flavor: 'Red velvet', price: 6600 }],
  },
  // ---------------- Sobremesas ----------------
  {
    name: 'Pudim de Leite Condensado',
    slug: 'pudim-leite-condensado',
    category: 'sobremesas',
    short: 'Lisinho, sem furinhos, com calda de caramelo.',
    description: 'O pudim mais pedido da casa: textura aveludada e calda de caramelo no ponto.',
    images: [['photo-1624353365286-3f8d62daad51', 'Pudim de leite com calda de caramelo']],
    variants: [
      { name: 'Pequeno · 6 fatias', size: 'Pequeno', price: 4500, stock: 6 },
      { name: 'Grande · 12 fatias', size: 'Grande', price: 7500 },
    ],
  },
  {
    name: 'Tiramisù no Pote',
    slug: 'tiramisu-no-pote',
    category: 'sobremesas',
    short: 'Mascarpone, café espresso e cacau em pote de vidro.',
    description: 'Biscoitos champanhe embebidos em café, creme de mascarpone e cacau belga. Pote de vidro de 200 ml.',
    images: [['photo-1571877227200-a0d98ea607e9', 'Tiramisù com cacau polvilhado']],
    variants: [{ name: 'Pote 200 ml', size: '200 ml', price: 2200, stock: 20 }],
  },
  {
    name: 'Pavê de Chocolate',
    slug: 'pave-de-chocolate',
    category: 'sobremesas',
    short: 'Camadas de biscoito, creme e ganache.',
    description: 'Sobremesa de família: creme de baunilha, biscoito champanhe e ganache de chocolate. Serve até 12 pessoas.',
    images: [['photo-1551024601-bec78aea704b', 'Sobremesa de chocolate em camadas']],
    variants: [{ name: 'Travessa · 12 porções', size: 'Travessa', price: 11000 }],
  },
  // ---------------- Salgados ----------------
  {
    name: 'Mini Salgados Sortidos',
    slug: 'mini-salgados-sortidos',
    category: 'salgados',
    short: 'Coxinha, kibe, risoles e bolinha de queijo.',
    description: 'Salgadinhos de festa fritos na hora da retirada/entrega. Informe nas observações se deseja algum sabor específico.',
    lead: 2,
    images: [['photo-1601050690597-df0568f70950', 'Salgadinhos de festa sortidos']],
    variants: [
      { name: '50 unidades', size: '50 unidades', price: 8500 },
      { name: '100 unidades', size: '100 unidades', price: 16000 },
    ],
  },
  {
    name: 'Quiche Lorraine',
    slug: 'quiche-lorraine',
    category: 'salgados',
    short: 'Massa amanteigada, bacon, queijo gruyère e creme.',
    description: 'Clássica quiche francesa, ótima para brunches e cafés da tarde.',
    images: [['photo-1608039829572-78524f79c4c7', 'Quiche assada em forma de torta']],
    variants: [
      { name: 'Fatia', size: 'Fatia', price: 1600, stock: 10 },
      { name: 'Inteira · 8 fatias', size: 'Inteira (22 cm)', price: 9500 },
    ],
  },
  {
    name: 'Croissant Recheado',
    slug: 'croissant-recheado',
    category: 'salgados',
    short: 'Massa folhada artesanal com presunto e queijo.',
    description: 'Croissants folhados feitos com manteiga de verdade, recheados com presunto e queijo.',
    images: [['photo-1555507036-ab1f4038808a', 'Croissants dourados e folhados']],
    variants: [{ name: 'Caixa com 6', size: '6 unidades', price: 5400, stock: 12 }],
  },
];

const gallery: [string, string][] = [
  ['photo-1535141192574-5d4897c12636', 'Naked cake de casamento com flores'],
  ['photo-1578985545062-69928b1d9587', 'Bolo de chocolate com frutas'],
  ['photo-1569864358642-9d1684040f43', 'Macarons coloridos'],
  ['photo-1464349095431-e9a21285b5f3', 'Bolo de aniversário decorado'],
  ['photo-1587314168485-3236d6710814', 'Cupcakes em tons pastel'],
  ['photo-1488477181946-6428a0291777', 'Sobremesa com frutas vermelhas'],
  ['photo-1542826438-bd32f43d626f', 'Bolo com flores naturais'],
  ['photo-1606313564200-e75d5e30476c', 'Brigadeiros gourmet'],
  ['photo-1565958011703-44f9829ba187', 'Torta cremosa'],
];

const testimonials = [
  { author: 'Juliana Martins', rating: 5, product: 'naked-cake-frutas-vermelhas', comment: 'O bolo do meu casamento foi um sonho! Lindo, delicado e todos os convidados elogiaram o sabor. Obrigada, Rafaella!' },
  { author: 'Carlos Eduardo', rating: 5, product: 'bolo-chocolate-belga-morangos', comment: 'Encomendei para o aniversário da minha esposa e foi sucesso absoluto. Chocolate na medida certa e morangos fresquinhos.' },
  { author: 'Fernanda Lima', rating: 5, product: 'brigadeiro-gourmet', comment: 'Os brigadeiros de pistache são viciantes! Chegaram impecáveis e a embalagem é linda.' },
  { author: 'Patrícia Rocha', rating: 5, product: 'torta-limao-siciliano', comment: 'A melhor torta de limão que já comi. Merengue perfeito e o creme bem azedinho, do jeito que eu amo.' },
  { author: 'Renata Alves', rating: 4, product: 'macarons-franceses', comment: 'Macarons delicados e super saborosos. Entrega no horário combinado. Voltarei a comprar!' },
  { author: 'Lucas Ferreira', rating: 5, product: 'bolo-floresta-negra', comment: 'Floresta negra de verdade, com cereja ao licor. Lembrou a da minha avó. Recomendo muito!' },
];

async function reset() {
  // Ordem respeita as chaves estrangeiras
  await prisma.payment.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customOrderStatusHistory.deleteMany();
  await prisma.customOrder.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.shippingZone.deleteMany();
  await prisma.galleryImage.deleteMany();
  await prisma.storeSettings.deleteMany();
}

function daysAgo(n: number, hour = 14) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function noonUTC(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12));
}

async function main() {
  console.log('🧹 Limpando dados antigos...');
  await reset();

  console.log('⚙️  Configurações da loja...');
  await prisma.storeSettings.create({
    data: {
      id: 1,
      storeName: 'Rafaella Cakes',
      phone: '(11) 3456-7890',
      whatsapp: '5511987654321',
      email: 'contato@rafaellacakes.com.br',
      instagramHandle: 'rafaellacakes',
      addressLine: 'Rua das Flores, 123 — Vila Madalena',
      city: 'São Paulo — SP',
      mapQuery: 'Vila Madalena, São Paulo - SP',
      openingHours: 'Terça a sexta: 9h às 19h\nSábado: 9h às 15h\nDomingo e segunda: fechado',
      aboutText:
        'A Rafaella Cakes nasceu na cozinha de casa, entre receitas de família e muita vontade de transformar momentos especiais em memórias doces. Cada bolo é feito à mão, com ingredientes selecionados, manteiga de verdade, chocolate belga e frutas frescas — sem pressa, do jeitinho que as coisas boas pedem.',
      minLeadDays: 2,
      customMinLeadDays: 7,
      openWeekdays: [2, 3, 4, 5, 6],
    },
  });

  console.log('👤 Usuários...');
  const admin = await prisma.user.create({
    data: {
      name: 'Rafaella',
      email: ADMIN_EMAIL.toLowerCase(),
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
    },
  });
  const customer = await prisma.user.create({
    data: {
      name: 'Maria Clara Souza',
      email: CUSTOMER_EMAIL,
      phone: '(11) 91234-5678',
      passwordHash: await bcrypt.hash(CUSTOMER_PASSWORD, 12),
      addresses: {
        create: {
          label: 'Casa',
          recipient: 'Maria Clara Souza',
          zipCode: '05433000',
          street: 'Rua Harmonia',
          number: '450',
          complement: 'Apto 32',
          neighborhood: 'Vila Madalena',
          city: 'São Paulo',
          state: 'SP',
          isDefault: true,
        },
      },
    },
  });

  console.log('🚚 Zonas de entrega...');
  await prisma.shippingZone.createMany({
    data: [
      {
        name: 'Vizinhança (até 3 km)',
        feeCents: 1000,
        neighborhoods: ['Vila Madalena', 'Pinheiros', 'Sumarézinho', 'Alto de Pinheiros', 'Perdizes'],
        sortOrder: 0,
      },
      { name: 'Zona Oeste', feeCents: 1800, cepStart: '05000000', cepEnd: '05899999', neighborhoods: [], sortOrder: 1 },
      { name: 'Centro e Zona Sul', feeCents: 2200, cepStart: '01000000', cepEnd: '04999999', neighborhoods: [], sortOrder: 2 },
    ],
  });

  console.log('🗂️  Categorias...');
  const categoryIds: Record<string, string> = {};
  for (const [i, c] of categories.entries()) {
    const created = await prisma.category.create({
      data: { name: c.name, slug: c.slug, description: c.description, imageUrl: img(c.image, 600), sortOrder: i },
    });
    categoryIds[c.slug] = created.id;
  }

  console.log('🎂 Produtos...');
  const productIds: Record<string, { id: string; variants: { id: string; name: string; priceCents: number }[]; image: string; name: string }> = {};
  for (const p of products) {
    const created = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        categoryId: categoryIds[p.category],
        shortDescription: p.short,
        description: p.description,
        isFeatured: Boolean(p.featured),
        leadTimeDays: p.lead ?? null,
        priceFromCents: Math.min(...p.variants.map((v) => v.price)),
        images: { create: p.images.map(([id, alt], i) => ({ url: img(id), alt, sortOrder: i })) },
        variants: {
          create: p.variants.map((v, i) => ({
            name: v.name,
            size: v.size ?? null,
            flavor: v.flavor ?? null,
            priceCents: v.price,
            stock: v.stock ?? null,
            sortOrder: i,
          })),
        },
      },
      include: { variants: { orderBy: { sortOrder: 'asc' } } },
    });
    productIds[p.slug] = {
      id: created.id,
      name: created.name,
      image: img(p.images[0][0]),
      variants: created.variants.map((v) => ({ id: v.id, name: v.name, priceCents: v.priceCents })),
    };
  }

  console.log('⭐ Avaliações e depoimentos...');
  for (const t of testimonials) {
    await prisma.review.create({
      data: {
        productId: productIds[t.product].id,
        authorName: t.author,
        rating: t.rating,
        comment: t.comment,
        isApproved: true,
        isFeatured: true,
        createdAt: daysAgo(Math.floor(Math.random() * 60) + 5),
      },
    });
  }
  await prisma.review.create({
    data: {
      productId: productIds['cupcakes-sortidos'].id,
      userId: customer.id,
      authorName: customer.name,
      rating: 5,
      comment: 'Cupcakes lindos e muito fofinhos! As crianças amaram.',
      isApproved: false,
    },
  });

  console.log('🖼️  Galeria...');
  await prisma.galleryImage.createMany({
    data: gallery.map(([id, alt], i) => ({ url: img(id, 1000), alt, sortOrder: i })),
  });

  console.log('🧾 Pedidos de exemplo (para o dashboard)...');
  const sample: { slug: string; v: number; qty: number }[][] = [
    [{ slug: 'bolo-floresta-negra', v: 1, qty: 1 }, { slug: 'brigadeiro-gourmet', v: 0, qty: 1 }],
    [{ slug: 'bolo-chocolate-belga-morangos', v: 2, qty: 1 }],
    [{ slug: 'brigadeiro-gourmet', v: 2, qty: 1 }, { slug: 'bem-casado-tradicional', v: 1, qty: 1 }],
    [{ slug: 'torta-limao-siciliano', v: 1, qty: 1 }],
    [{ slug: 'macarons-franceses', v: 1, qty: 2 }],
    [{ slug: 'cupcakes-sortidos', v: 1, qty: 1 }, { slug: 'brigadeiro-gourmet', v: 0, qty: 2 }],
    [{ slug: 'naked-cake-frutas-vermelhas', v: 0, qty: 1 }],
    [{ slug: 'cheesecake-frutas-vermelhas', v: 1, qty: 1 }],
    [{ slug: 'mini-salgados-sortidos', v: 1, qty: 1 }, { slug: 'bolo-red-velvet', v: 1, qty: 1 }],
    [{ slug: 'pudim-leite-condensado', v: 1, qty: 1 }],
    [{ slug: 'brigadeiro-gourmet', v: 1, qty: 1 }],
    [{ slug: 'bolo-floresta-negra', v: 2, qty: 1 }],
  ];
  const statuses: OrderStatus[] = ['DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'READY', 'IN_PREPARATION', 'RECEIVED', 'PENDING_PAYMENT'];
  const ages = [150, 120, 95, 70, 52, 40, 28, 16, 6, 3, 1, 0];

  for (const [i, lines] of sample.entries()) {
    const items = lines.map((l) => {
      const p = productIds[l.slug];
      const variant = p.variants[Math.min(l.v, p.variants.length - 1)];
      return {
        productId: p.id,
        variantId: variant.id,
        productName: p.name,
        variantName: variant.name,
        imageUrl: p.image,
        unitPriceCents: variant.priceCents,
        quantity: l.qty,
        totalCents: variant.priceCents * l.qty,
      };
    });
    const delivery = i % 3 !== 0;
    const subtotal = items.reduce((s, it) => s + it.totalCents, 0);
    const shipping = delivery ? 1000 : 0;
    const createdAt = daysAgo(ages[i], 10);
    const status = statuses[i];
    const paid = status !== 'PENDING_PAYMENT';
    const scheduled = noonUTC(daysAgo(ages[i] - 3));

    const flow: OrderStatus[] = ['PENDING_PAYMENT', 'RECEIVED', 'IN_PREPARATION', 'READY', delivery ? 'OUT_FOR_DELIVERY' : 'READY', 'DELIVERED'];
    const history = [...new Set(flow.slice(0, flow.indexOf(status) + 1))].map((s, idx) => ({
      status: s,
      note: idx === 0 ? 'Pedido criado' : s === 'RECEIVED' ? 'Pagamento aprovado (Pix)' : null,
      createdAt: new Date(createdAt.getTime() + idx * 3_600_000),
    }));

    await prisma.order.create({
      data: {
        userId: customer.id,
        status,
        fulfillmentType: delivery ? 'DELIVERY' : 'PICKUP',
        paymentMethod: i % 2 ? 'CARD' : 'PIX',
        scheduledDate: scheduled,
        subtotalCents: subtotal,
        shippingCents: shipping,
        totalCents: subtotal + shipping,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        shippingZone: delivery ? 'Vizinhança (até 3 km)' : null,
        shippingAddress: delivery
          ? { label: 'Casa', recipient: customer.name, zipCode: '05433000', street: 'Rua Harmonia', number: '450', complement: 'Apto 32', neighborhood: 'Vila Madalena', city: 'São Paulo', state: 'SP' }
          : undefined,
        paidAt: paid ? new Date(createdAt.getTime() + 3_600_000) : null,
        createdAt,
        items: { create: items },
        statusHistory: { create: history },
        payments: {
          create: {
            method: i % 2 ? 'CARD' : 'PIX',
            status: paid ? 'APPROVED' : 'PENDING',
            amountCents: subtotal + shipping,
            provider: 'mock',
            createdAt,
          },
        },
      },
    });
  }

  console.log('✨ Encomendas personalizadas...');
  await prisma.customOrder.create({
    data: {
      userId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone!,
      eventType: 'Aniversário de 1 ano',
      eventDate: noonUTC(daysAgo(-20)),
      guests: 40,
      size: '2 andares',
      flavor: 'Baunilha',
      filling: 'Brigadeiro branco com morangos',
      frosting: 'Chantininho rosa claro',
      fulfillmentType: 'PICKUP',
      notes: 'Tema jardim encantado, com borboletas e o nome "Alice" no topo.',
      status: 'QUOTED',
      quotedPriceCents: 48000,
      quoteMessage: 'Que tema lindo! Incluímos topo personalizado em papel e 6 borboletas em pasta americana. 💕',
      statusHistory: {
        create: [
          { status: 'REQUESTED', note: 'Solicitação enviada pelo site' },
          { status: 'QUOTED', note: 'Atualizado pela Rafaella' },
        ],
      },
    },
  });
  await prisma.customOrder.create({
    data: {
      customerName: 'Beatriz Nogueira',
      customerEmail: 'beatriz@exemplo.com',
      customerPhone: '(11) 99876-5432',
      eventType: 'Casamento',
      eventDate: noonUTC(daysAgo(-45)),
      guests: 150,
      size: '3 andares',
      flavor: 'Massa de nozes',
      filling: 'Doce de leite com nozes e damasco',
      frosting: 'Buttercream branco com flores naturais',
      fulfillmentType: 'DELIVERY',
      notes: 'Casamento no campo, estilo rústico chique. Gostaríamos também de 300 bem-casados.',
      status: 'REQUESTED',
      statusHistory: { create: { status: 'REQUESTED', note: 'Solicitação enviada pelo site' } },
    },
  });

  console.log('\n✅ Seed concluído!');
  console.log(`   Admin:   ${admin.email} / ${ADMIN_PASSWORD}   →  http://localhost:3000/admin`);
  console.log(`   Cliente: ${CUSTOMER_EMAIL} / ${CUSTOMER_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
