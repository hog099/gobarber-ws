import { fromat, parseISO } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Mail from '../../lib/Mail';

class Cancellationmail {

    get key() {
        return 'CancellationMail';
    }

    async handle({ data }) {
        // console.log('A fila Executou')

        const { appointment } = data;
        await Mail.sendMail({
            to: `${appointment.provider.name} <${appointment.provider.email}>`,
            subject: 'Agendamenrto Cancelado',
            template: 'cancellation',
            context: {
                provider: appointment.provider.name,
                user: appointment.user.name,
                date: format(parseISO(appointment.date), "'dia' dd 'de' MMMM', às' H:mm'h'", { locale: pt }),
            },
        });
    }

}


export default new Cancellationmail();