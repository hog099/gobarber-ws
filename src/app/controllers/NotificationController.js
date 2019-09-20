import User from '../models/User';
import Notification from '../schemas/Notification';

class NotificationController {

    async index(req, res){

        const user_id = req.userId; 

        // CHECK se provider_id e um prestador de servico
        const checkIsProvider = await User.findOne({ where: { id: user_id, provider: true } });

        if (!checkIsProvider) {
            return res.status(401).json({ error: 'Somente Prestadores Podem ter notificações' });
        }


        const notifications = await Notification.find({
            user: user_id,
        }).sort({createdAt: 'desc'}).limit(20);


        return res.json(notifications);

    }


    async update(req, res){

        const notification = await Notification.findByIdAndUpdate(
            req.params.id, 
            {read: true},
            {new: true}
            );

            return res.json(notification);

    }




}


export default new NotificationController();