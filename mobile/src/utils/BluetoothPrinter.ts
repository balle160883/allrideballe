import { Share, Alert } from 'react-native';

export type TicketType = 'aviso' | 'promesa' | 'aval';

export interface TicketData {
  tipo: TicketType;
  nombreSocio: string;
  socioId: string;
  cuenta: string;
  saldoAtrasado: number;
  gestorNombre: string;
  gestorTelefono?: string;
  // Para Promesas
  folioConvenio?: string;
  observaciones?: string;
  // Para Avales
  nombreAval?: string;
  titularNombre?: string;
  titularSocioId?: string;
}

export const BluetoothPrinter = {
  generateTicket: async (data: TicketData) => {
    const now = new Date();
    const fechaStr = now.toLocaleDateString('es-MX');
    const horaStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const ticketId = `#VN-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Máscara: Solo últimos 4 dígitos del socioId
    const socioMask = data.socioId.slice(-4).padStart(data.socioId.length, '*');
    
    let header = `
********************************
      *CAJA POPULAR OBLATOS*
********************************
TICKET: ${ticketId}
FECHA: ${fechaStr} ${horaStr}
TIPO: ${data.tipo === 'aval' ? 'ATENCION AVAL' : 'AVISO TITULAR'}
NO. SOCIO: ${data.socioId || 'N/A'}
CUENTA: ${data.cuenta}
NOMBRE: ${data.tipo === 'aval' ? data.nombreAval : data.nombreSocio}
--------------------------------
`;

    let body = '';

    if (data.tipo === 'aviso') {
      body = `
RESULTADO: *** NO LE ENCONTRAMOS ***

Le informamos que acudimos a su 
domicilio para regularizar su 
crédito.

ACCION REQUERIDA:
Recuerde que los créditos que
se encuentran en cartera vencida
generan gastos de cobranza.
`;
    } else if (data.tipo === 'promesa') {
      body = `
FOLIO CONVENIO: ${data.folioConvenio || '#CV-TEMP'}

El socio reconoce el atraso y se 
compromete a regularizar su saldo
bajo las condiciones acordadas.

REFERENCIAS DE PAGO: 
Pague en sucursal con su número:
Socio: ${socioMask}

OBSERVACIONES:
${data.observaciones || 'Sin observaciones'}

--------------------------------
FIRMAMOS DE CONFORMIDAD:


________________________________
       FIRMA DEL SOCIO


________________________________
       FIRMA DEL GESTOR
`;
    } else if (data.tipo === 'aval') {
      body = `
ATENCION AVAL: ${data.nombreAval}

Se le visita en su calidad de 
AVAL para la regularización del 
crédito del deudor titular:

TITULAR: ${data.titularNombre}
SOCIO TITULAR: ${data.titularSocioId?.slice(-4).padStart(8, '*')}

Por favor, inste a su avalado a
ponerse al corriente.
`;
    }

    let footer = `
--------------------------------
ESTADO FINANCIERO:
SALDO ATRASADO: $${data.saldoAtrasado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}

--------------------------------
GESTOR: ${data.gestorNombre}
CONTACTO: ${data.gestorTelefono || '3339421050 ext. 1110, 1111, 1194'}

!!! AVISO DE SEGURIDAD !!!
El gestor NO tiene autorización
para recibir abonos en EFECTIVO.
Realice sus pagos solo en caja.

--------------------------------
Aviso de Privacidad:
bit.ly/cpo-privacidad
www.cajapopularoblatos.com.mx
********************************
\n\n\n`;

    const fullTicket = header + body + footer;

    try {
      await Share.share({
        message: fullTicket,
        title: 'Ticket Caja Popular Oblatos'
      });
      return true;
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo generar el ticket: ' + e.message);
      return false;
    }
  }
};
