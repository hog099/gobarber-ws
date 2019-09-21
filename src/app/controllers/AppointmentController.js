import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';
import User from '../models/User';
import File from '../models/File';
import Appointment from '../models/Appointment';
import Notification from '../schemas/Notification';

import CancellationMail from '../jobs/CancellationMail';
import Queue from '../../lib/Queue';

class AppointmentController {

    async index(req, res) {
        const { page = 1 } = req.query;

        const appointments = await Appointment.findAll({
            where: { user_id: req.userId, canceled_at: null },
            order: ['date'],
            attributes: ['id', 'date', 'past', 'cancelable'],
            limit: 20,
            offset: (page - 1) * 20,
            include: [
                {
                    model: User,
                    as: 'provider',
                    attributes: ['id', 'name'],
                    include: [
                        {
                            model: File,
                            as: 'avatar',
                            attributes: ['id', 'path', 'url'],
                        }
                    ]
                }
            ]

        });

        return res.json(appointments);

    }



    async store(req, res) {

        const schema = Yup.object().shape({
            provider_id: Yup.number().required(),
            date: Yup.date().required(),
        });

        if (!(await schema.isValid(req.body))) {
            return res.status(400).json({ error: 'Validação de Agendamento Falhou' });
        }

        const { provider_id, date } = req.body;

        // CHECK se provider_id e um prestador de servico
        const checkIsProvider = await User.findOne({ where: { id: provider_id, provider: true } });

        if (!checkIsProvider) {
            return res.status(401).json({ error: 'Você não pode criar um Agendamento como Prestador' });
        }


        // validar data e Hora agendamentos com intervalos de 1 hora cada
        const hourStart = startOfHour(parseISO(date));

        if (isBefore(hourStart, new Date())) {
            return res.status(400).json({ error: 'Data do agendamento anterior a data atual.' });
        }

        // validar se o profissionjal ja não possui horario marcado neste horario
        const checkAvailabillity = await Appointment.findOne({
            whrere: {
                provider_id,
                canceled_at: null,
                date: hourStart,
            },
        });

        if (!checkAvailabillity) {
            return res.status(400).json({ error: 'Horário desejado não está disponivel' });
        }

        // Verificação se esta marcando um horrio para ele mesmo
        if (provider_id === req.userId) {
            return res.status(400).json({ error: 'Não é possível marcar um horario para voce mesmo' });
        }


        // console.log(req.userId, req.body.provider_id, date);

        const user_id = req.userId; // Capta o ID do usuario logado, pegar do mniddleware auth
        const appointment = await Appointment.create({
            user_id: user_id,
            provider_id: provider_id,
            date
        });



        // Notificar prestador de servico - Incluuir no Mongodb
        const user = await User.findByPk(user_id);
        const formattedDate = format(
            hourStart,
            "'dia' dd 'de' MMMM', às' H:mm'h'",
            { locale: pt }
        );

        await Notification.create({
            content: `Novo Agendamento de ${user.name} para ${formattedDate}`,
            user: provider_id,
        });


        return res.json(appointment);
    }



    async delete(req, res) {

        const appointment = await Appointment.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'provider',
                    attributes: ['name', 'email'],
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['name'],
                },
            ]
        });

        if (appointment.user_id !== req.userId) {
            return res.status(401).json({ error: "Você não tem permissão para cancelar esse agendamento" });
        }

        // Reduz 2 horas da Hora do agendamento
        const dateWithSub = subHours(appointment.date, 2);
        // Verifica se tem 2 horas antes do marcado para deixar cancelar
        if (isBefore(dateWithSub, new Date())) {
            return res.status(401).json({ error: "Agendamento somente podem ser cancelados com 2 horas de antecedência" });
        }


        appointment.canceled_at = new Date();

        await appointment.save();

        //Send Email
        await Queue.add(CancellationMail.key, {
            appointment,
        });


        return res.json(appointment);

    }

}

export default new AppointmentController();