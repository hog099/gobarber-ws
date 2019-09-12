import User from '../models/User';

class UserController {

    async store(req, res) {
        const userExists = await User.findOne({where: {email: req.body.email} } );
        if(userExists){
            return res.status(400).json({error: 'Usuário ja existe no Cadastro!'});
        }

        // const user = await User.create(req.body);
        const {id, name, email, provider} = await User.create(req.body);

        return res.json({id, name, email, provider});
    }




    
}

export default new UserController();