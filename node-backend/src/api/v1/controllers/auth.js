// const jwt = require('jsonwebtoken'); // will be using in future to implement refresh token

const { sequelize } = require('../../../sequelize/config');
const { User, Session } = require('../../../sequelize/models');
const {
  hashPassword,
  comparePassword,
  isDefinedAndNotNull
} = require('../../../utils');
const { ResponseError } = require('../../../utils');

exports.signUp = async (req, res, next) => {
  try {
    const result = await sequelize.transaction(async (t) => {
      const { name, email, password } = req.body;

      const passwordHash = await hashPassword(password);

      const newUser = await User.create(
        { name, email, passwordHash },
        { transaction: t }
      );

      const newSession = await Session.create({}, { transaction: t });

      await newSession.setUser(newUser);

      return { session: newSession, user: newUser };
    });

    res.status(201).json({
      status: true,
      message: 'Sign up successful',
      data: {
        authToken: result.session.uuid,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email
        }
      }
    });
  } catch (err) {
    next(new ResponseError(err.message));
  }
};

exports.signIn = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
      attributes: { exclude: ['created_at', 'updated_at'] }
    });

    if (!isDefinedAndNotNull(user)) {
      throw new ResponseError('Invalid account.', 401);
    }

    if (!user.isActive) {
      throw new ResponseError('Inactive account.', 401);
    }

    const isMatched = await comparePassword(password, user.passwordHash);

    if (!isMatched) {
      throw new ResponseError('Authentication failed.', 401);
    }

    const newSession = await user.createSession();

    res.status(200).json({
      status: true,
      message: 'Sign in successful',
      data: {
        authToken: newSession.uuid,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      }
    });
  } catch (err) {
    next(new ResponseError(err.message, err.status));
  }
};

exports.signOut = async (req, res, next) => {
  try {
    await req.session.destroy();
    res.status(200).json({
      status: true,
      message: 'Sign out successful',
      data: null
    });
  } catch (err) {
    next(new ResponseError(err.message, err.status));
  }
};

exports.isEmailAvailable = async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: { email: req.body.email },
      attributes: ['id', 'email']
    });
    if (isDefinedAndNotNull(user)) {
      res.status(200).json({
        status: false,
        message: 'Email is not available'
      });
    } else {
      res.status(200).json({
        status: true,
        message: 'Email is available'
      });
    }
  } catch (err) {
    next(new ResponseError(err.message, err.status));
  }
};

// exports.forgotPassword = (req, res, next) => {
//   res.status(200).json({
//     status: true,
//     message: 'FORGOT PASSWORD',
//     data: req.body
//   });
// };

// exports.resetPassword = (req, res, next) => {
//   res.status(200).json({
//     status: true,
//     message: 'RESET PASSWORD',
//     data: req.body
//   });
// };
