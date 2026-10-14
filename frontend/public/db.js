import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 5000 
    });
    console.log('MongoDB conectado exitosamente');
  } catch (error) {
    console.error('Error de conexión:', error);
    process.exit(1);
  }
};

export default connectDB