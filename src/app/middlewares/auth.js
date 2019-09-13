import jwt from 'jsonwebtoken';
import {promisify} from 'util';
import authConfig from '../../config/auth';


export default async (req, res, next) => {
    const authHeader = req.headers.authorization;

    // console.log(authHeader);
    if(!authHeader){
        return res.status(401).json({error: "Token Não Encontrado para Realizar Operação"});
    }
    
    const [, token] = authHeader.split(' '); // receber do header de forma desestruturada para pegar somente o token pois a posicao [0] é o bearer

    try {
        
        const decoded = await promisify(jwt.verify)(token, authConfig.secret); // Transformar uma função de callback modelo antigo para utilizar async await
        // Valida se o token é valido e procede com a aplicação

        req.userId = decoded.id;

        return next();

    } catch (err) {
        return res.status(401).json({error: "Token Inválido para Realizar Operação"});
    }

    return next();

}