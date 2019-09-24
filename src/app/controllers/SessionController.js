import jwt from 'jsonwebtoken';
import * as Yup from 'yup';
import authConfig from '../../config/auth';

import User from '../models/User';
import File from '../models/File';

class SessionController {

    async store(req, res){

        const schema = Yup.object().shape({
            email: Yup.string().email().required(),
            password: Yup.string().required(),
        });

        if( !(await schema.isValid(req.body)) ){
            return res.status(400).json({ error: 'Validação de Campos com Advertência.' });
        }

        const {email, password} = req.body;

        const user = await User.findOne({
            where: {email},
            include: [
                {
                    model: File,
                    as: 'avatar',
                    attributes: ['id','path','url'],
                }
            ]
        });

        if(!user){
            return res.status(401).json({error: 'Usuário não Existe na Base de Dados.'});
        }
        
        if( !await user.checkPassword(password) ){
            return res.status(401).json({error: 'A Senha Não Confere com a do Usuário.'});
        }

        const {id, name, avatar, provider} = user;

        return res.json({
            user:{
                id,
                name,
                email,
                provider,
                avatar,
            },
            token: jwt.sign( 
                {id}, 
                authConfig.secret, 
                {expiresIn: authConfig.expiresIn} 
            ),
            
        });

    }




}

export default new SessionController();