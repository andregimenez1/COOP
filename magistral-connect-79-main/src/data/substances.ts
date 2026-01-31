import { Substance } from '@/types';

// Lista de matérias-primas disponíveis no sistema
export const substances: Substance[] = [
  { id: '1', name: 'Vitamina C (Ácido Ascórbico)', synonyms: ['Ácido Ascórbico', 'Vitamina C', 'Ascorbic Acid'], createdAt: new Date() },
  { id: '2', name: 'Colágeno Hidrolisado', synonyms: ['Colágeno', 'Hydrolyzed Collagen', 'Collagen Peptides'], createdAt: new Date() },
  { id: '3', name: 'Ácido Hialurônico', synonyms: ['Hyaluronic Acid', 'Ácido Hialurónico', 'HA'], createdAt: new Date() },
  { id: '4', name: 'Magnésio Quelato', synonyms: ['Magnesium Chelate', 'Magnésio', 'Mg Quelato'], createdAt: new Date() },
  { id: '5', name: 'Coenzima Q10', synonyms: ['CoQ10', 'Ubiquinona', 'Ubiquinone'], createdAt: new Date() },
  { id: '6', name: 'Vitamina D3', synonyms: ['Colecalciferol', 'Cholecalciferol', 'Vitamina D'], createdAt: new Date() },
  { id: '7', name: 'Vitamina B12', synonyms: ['Cianocobalamina', 'Cyanocobalamin', 'Cobalamina'], createdAt: new Date() },
  { id: '8', name: 'Ácido Fólico', synonyms: ['Folato', 'Folic Acid', 'Vitamina B9'], createdAt: new Date() },
  { id: '9', name: 'Ferro Quelato', synonyms: ['Iron Chelate', 'Ferro', 'Iron Bisglycinate'], createdAt: new Date() },
  { id: '10', name: 'Zinco Quelato', synonyms: ['Zinc Chelate', 'Zinco', 'Zinc Bisglycinate'], createdAt: new Date() },
  { id: '11', name: 'Cálcio Carbonato', synonyms: ['Calcium Carbonate', 'Carbonato de Cálcio'], createdAt: new Date() },
  { id: '12', name: 'Ômega 3', synonyms: ['Omega 3', 'Ácidos Graxos', 'EPA/DHA'], createdAt: new Date() },
  { id: '13', name: 'Probióticos', synonyms: ['Lactobacillus', 'Bifidobacterium', 'Probiótico'], createdAt: new Date() },
  { id: '14', name: 'Glucosamina', synonyms: ['Glucosamine', 'Glucosamina Sulfato'], createdAt: new Date() },
  { id: '15', name: 'Condroitina', synonyms: ['Chondroitin', 'Condroitina Sulfato'], createdAt: new Date() },
  { id: '16', name: 'Melatonina', synonyms: ['Melatonin', 'Melatonina'], createdAt: new Date() },
  { id: '17', name: 'Curcumina', synonyms: ['Curcumin', 'Cúrcuma', 'Turmeric'], createdAt: new Date() },
  { id: '18', name: 'Resveratrol', synonyms: ['Resveratrol', 'Resveratrol'], createdAt: new Date() },
  { id: '19', name: 'Spirulina', synonyms: ['Espirulina', 'Spirulina'], createdAt: new Date() },
  { id: '20', name: 'Chlorella', synonyms: ['Clorela', 'Chlorella'], createdAt: new Date() },
];
