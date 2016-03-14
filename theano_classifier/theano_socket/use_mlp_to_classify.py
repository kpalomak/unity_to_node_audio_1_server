import numpy as np
from os.path import join

import os
import sys

import timeit
import time

import cPickle

import numpy
import pydot


from theano.tensor.shared_randomstreams import RandomStreams
import theano.tensor as T
import theano



import binascii
import socket
import struct
import sys

HOST = 'localhost'        # Symbolic name meaning all available interfaces
PORT = 50007              # Arbitrary non-privileged port
ack  = '1'




def load_data(data_set):
    print '... loading the data'
    # store = pd.HDFStore(data_file)
    # meta = store.meta

    # np.random.seed(839282)
    # validation_mask = np.random.rand(len(meta)) > 0.75

    # train_set = meta.train & (meta.sent_type != 'sa') & np.logical_not(validation_mask)
    # valid_set = meta.train & (meta.sent_type != 'sa') & validation_mask
    # test_set = meta.core_test & (meta.sent_type != 'sa')

    # print "%d training, %d validation, %d test" % (train_set.sum(), valid_set.sum(), test_set.sum())

    # train_x = store.select('X', 'file in meta.index[train_set]').values
    # train_y = store.select('y', 'file in meta.index[train_set]')['conf_label'].values

    # valid_x = store.select('X', 'file in meta.index[valid_set]').values
    # valid_y = store.select('y', 'file in meta.index[valid_set]')['conf_label'].values

    # test_x = store.select('X', 'file in meta.index[test_set]').values
    # test_y = store.select('y', 'file in meta.index[test_set]')['conf_label'].values

    # store.close()

    featpath='/teamwork/t40511_asr/p/siak/aalto_recordings/evaluations/dnn_feature_extract/'
    
    train_feat_in="train.feat.np"
    train_class_in="train.class.np"
    
    devel_feat_in="devel.feat.np"
    devel_class_in="devel.class.np"
    
    eval_feat_in="eval.feat.np"
    eval_class_in="eval.class.np"

    featdim=270

    if 0 == 1:
        train_x=np.reshape(np.fromfile(featpath+train_feat_in, dtype=np.float32), (-1, featdim))
        train_y=np.fromfile(featpath+train_class_in, dtype=np.float32)

    else:
        train_x=None
        train_y=None


    #perm=np.random.permutation(np.size(train_feats,0))

    # trainset=[train_feats[perm],train_classes[perm].astype(np.integer)]

    valid_x=np.reshape(np.fromfile(featpath+devel_feat_in, dtype=np.float32), (-1, featdim))
    valid_y=np.fromfile(featpath+devel_class_in, dtype=np.float32)

    # develset=[devel_feats,devel_classes.astype(np.integer)]

    test_x=np.reshape(np.fromfile(featpath+eval_feat_in, dtype=np.float32), (-1, featdim))
    test_y=np.fromfile(featpath+eval_class_in, dtype=np.float32)

    # evalset=[eval_feats,eval_classes.astype(np.integer)]


    #print '... shuffling the data'
    #p = np.random.permutation(train_x.shape[0])
    #train_x = train_x[p]
    #train_y = train_y[p]

    if 0 == 1:
        m = train_x.mean(axis=0)
        std = train_x.std(axis=0)

        print "Writing mean and std to files:"
        m.tofile("phonestats.mean.np")
        std.tofile("phonestats.std.np")
        print "Done"

        train_x = (train_x - m) / std
        valid_x = (valid_x - m) / std

        test_x = (test_x - m) / std
        phones = list(sorted(set(train_y.flatten().tolist() + valid_y.flatten().tolist() + test_y.flatten().tolist())))
        
        train_y = [phones.index(p) for p in train_y]
        valid_y = [phones.index(p) for p in valid_y]

    else:
        m=numpy.fromfile("phonestats.mean.np", dtype=numpy.float32)
        std=numpy.fromfile("phonestats.std.np", dtype=numpy.float32)

        test_x = (test_x - m) / std
        phones = list(sorted(set(test_y.flatten().tolist())))
    

    
    test_y = [phones.index(p) for p in test_y]



    def shared_dataset(data_xy, borrow=True):

        data_x, data_y = data_xy
        shared_x = theano.shared(np.asarray(data_x,
                                               dtype=theano.config.floatX),
                                 borrow=borrow)
        shared_y = theano.shared(np.asarray(data_y,
                                               dtype=theano.config.floatX),
                                 borrow=borrow)

        return shared_x, T.cast(shared_y, 'int32')

    test_set_x, test_set_y = shared_dataset((test_x,test_y))
    #valid_set_x, valid_set_y = shared_dataset((valid_x,valid_y))
    #train_set_x, train_set_y = shared_dataset((train_x,train_y))

    rval = [(test_set_x, test_set_y)]
    return rval

"""
This tutorial introduces the multilayer perceptron using Theano.
 A multilayer perceptron is a logistic regressor where
instead of feeding the input to the logistic regression you insert a
intermediate layer, called the hidden layer, that has a nonlinear
activation function (usually tanh or sigmoid) . One can use many such
hidden layers making the architecture deep. The tutorial will also tackle
the problem of MNIST digit classification.
.. math::
    f(x) = G( b^{(2)} + W^{(2)}( s( b^{(1)} + W^{(1)} x))),
References:
    - textbooks: "Pattern Recognition and Machine Learning" -
                 Christopher M. Bishop, section 5
"""
__docformat__ = 'restructedtext en'




class LogisticRegression(object):
    """Multi-class Logistic Regression Class
    The logistic regression is fully described by a weight matrix :math:`W`
    and bias vector :math:`b`. Classification is done by projecting data
    points onto a set of hyperplanes, the distance to which is used to
    determine a class membership probability.
    """

    def __init__(self, input, n_in, n_out):
        """ Initialize the parameters of the logistic regression
        :type input: theano.tensor.TensorType
        :param input: symbolic variable that describes the input of the
                      architecture (one minibatch)
        :type n_in: int
        :param n_in: number of input units, the dimension of the space in
                     which the datapoints lie
        :type n_out: int
        :param n_out: number of output units, the dimension of the space in
                      which the labels lie
        """
        # start-snippet-1
        # initialize with 0 the weights W as a matrix of shape (n_in, n_out)
        self.W = theano.shared(
            value=numpy.zeros(
                (n_in, n_out),
                dtype=theano.config.floatX
            ),
            name='W',
            borrow=True
        )
        # initialize the biases b as a vector of n_out 0s
        self.b = theano.shared(
            value=numpy.zeros(
                (n_out,),
                dtype=theano.config.floatX
            ),
            name='b',
            borrow=True
        )

        # symbolic expression for computing the matrix of class-membership
        # probabilities
        # Where:
        # W is a matrix where column-k represent the separation hyperplane for
        # class-k
        # x is a matrix where row-j  represents input training sample-j
        # b is a vector where element-k represent the free parameter of
        # hyperplane-k
        self.p_y_given_x = T.nnet.softmax(T.dot(input, self.W) + self.b)

        # symbolic description of how to compute prediction as class whose
        # probability is maximal
        self.y_pred = T.argmax(self.p_y_given_x, axis=1)
        # end-snippet-1

        # parameters of the model
        self.params = [self.W, self.b]

        # keep track of model input
        self.input = input

    def negative_log_likelihood(self, y):
        """Return the mean of the negative log-likelihood of the prediction
        of this model under a given target distribution.
        .. math::
            \frac{1}{|\mathcal{D}|} \mathcal{L} (\theta=\{W,b\}, \mathcal{D}) =
            \frac{1}{|\mathcal{D}|} \sum_{i=0}^{|\mathcal{D}|}
                \log(P(Y=y^{(i)}|x^{(i)}, W,b)) \\
            \ell (\theta=\{W,b\}, \mathcal{D})
        :type y: theano.tensor.TensorType
        :param y: corresponds to a vector that gives for each example the
                  correct label
        Note: we use the mean instead of the sum so that
              the learning rate is less dependent on the batch size
        """
        # start-snippet-2
        # y.shape[0] is (symbolically) the number of rows in y, i.e.,
        # number of examples (call it n) in the minibatch
        # T.arange(y.shape[0]) is a symbolic vector which will contain
        # [0,1,2,... n-1] T.log(self.p_y_given_x) is a matrix of
        # Log-Probabilities (call it LP) with one row per example and
        # one column per class LP[T.arange(y.shape[0]),y] is a vector
        # v containing [LP[0,y[0]], LP[1,y[1]], LP[2,y[2]], ...,
        # LP[n-1,y[n-1]]] and T.mean(LP[T.arange(y.shape[0]),y]) is
        # the mean (across minibatch examples) of the elements in v,
        # i.e., the mean log-likelihood across the minibatch.
        return -T.mean(T.log(self.p_y_given_x)[T.arange(y.shape[0]), y])
        # end-snippet-2

    def errors(self, y):
        """Return a float representing the number of errors in the minibatch
        over the total number of examples of the minibatch ; zero one
        loss over the size of the minibatch
        :type y: theano.tensor.TensorType
        :param y: corresponds to a vector that gives for each example the
                  correct label
        """

        # check if y has same dimension of y_pred
        if y.ndim != self.y_pred.ndim:
            raise TypeError(
                'y should have the same shape as self.y_pred',
                ('y', y.type, 'y_pred', self.y_pred.type)
            )
        # check if y is of the correct datatype
        if y.dtype.startswith('int'):
            # the T.neq operator returns a vector of 0s and 1s, where 1
            # represents a mistake in prediction
            return T.mean(T.neq(self.y_pred, y))
        else:
            raise NotImplementedError()


#    # No, this addition did not work... -r
    # def y_prediction(self, y):
    #     # check if y has same dimension of y_pred
    #     if y.ndim != self.y_pred.ndim:
    #         raise TypeError(
    #             'y should have the same shape as self.y_pred',
    #             ('y', y.type, 'y_pred', self.y_pred.type)
    #         )
    #     # check if y is of the correct datatype
    #     if y.dtype.startswith('int'):
    #         # the T.neq operator returns a vector of 0s and 1s, where 1
    #         # represents a mistake in prediction
    #         #return (self.y_pred) # 
    #         return T.argmax(self.p_y_given_x, axis=1)
    #     else:
    #         raise NotImplementedError()
    def y_prediction(self, y):
         # check if y has same dimension of y_pred
        if y.ndim != self.y_pred.ndim:
            raise TypeError(
                'y should have the same shape as self.y_pred',
                ('y', y.type, 'y_pred', self.y_pred.type)
            )
        # check if y is of the correct datatype
        if y.dtype.startswith('int'):
            # the T.neq operator returns a vector of 0s and 1s, where 1
            # represents a mistake in prediction
            return  (self.y_pred,y)
        else:
            raise NotImplementedError()



# start-snippet-1
class HiddenLayer(object):
    def __init__(self, rng, input, n_in, n_out, W=None, b=None,
                 activation=T.tanh):
        """
        Typical hidden layer of a MLP: units are fully-connected and have
        sigmoidal activation function. Weight matrix W is of shape (n_in,n_out)
        and the bias vector b is of shape (n_out,).
        NOTE : The nonlinearity used here is tanh
        Hidden unit activation is given by: tanh(dot(input,W) + b)
        :type rng: numpy.random.RandomState
        :param rng: a random number generator used to initialize weights
        :type input: theano.tensor.dmatrix
        :param input: a symbolic tensor of shape (n_examples, n_in)
        :type n_in: int
        :param n_in: dimensionality of input
        :type n_out: int
        :param n_out: number of hidden units
        :type activation: theano.Op or function
        :param activation: Non linearity to be applied in the hidden
                           layer
        """
        self.input = input
        # end-snippet-1

        # `W` is initialized with `W_values` which is uniformely sampled
        # from sqrt(-6./(n_in+n_hidden)) and sqrt(6./(n_in+n_hidden))
        # for tanh activation function
        # the output of uniform if converted using asarray to dtype
        # theano.config.floatX so that the code is runable on GPU
        # Note : optimal initialization of weights is dependent on the
        #        activation function used (among other things).
        #        For example, results presented in [Xavier10] suggest that you
        #        should use 4 times larger initial weights for sigmoid
        #        compared to tanh
        #        We have no info for other function, so we use the same as
        #        tanh.
        if W is None:
            W_values = numpy.asarray(
                rng.uniform(
                    low=-numpy.sqrt(6. / (n_in + n_out)),
                    high=numpy.sqrt(6. / (n_in + n_out)),
                    size=(n_in, n_out)
                ),
                dtype=theano.config.floatX
            )
            if activation == theano.tensor.nnet.sigmoid:
                W_values *= 4

            W = theano.shared(value=W_values, name='W', borrow=True)

        if b is None:
            b_values = numpy.zeros((n_out,), dtype=theano.config.floatX)
            b = theano.shared(value=b_values, name='b', borrow=True)

        self.W = W
        self.b = b

        lin_output = T.dot(input, self.W) + self.b
        self.output = (
            lin_output if activation is None
            else activation(lin_output)
        )
        # parameters of the model
        self.params = [self.W, self.b]


# start-snippet-2
class MLP(object):
    """Multi-Layer Perceptron Class
    A multilayer perceptron is a feedforward artificial neural network model
    that has one layer or more of hidden units and nonlinear activations.
    Intermediate layers usually have as activation function tanh or the
    sigmoid function (defined here by a ``HiddenLayer`` class)  while the
    top layer is a softmax layer (defined here by a ``LogisticRegression``
    class).
    """

    def __init__(self, rng, input, n_in, n_hidden, n_out, noise_level):
        """Initialize the parameters for the multilayer perceptron
        :type rng: numpy.random.RandomState
        :param rng: a random number generator used to initialize weights
        :type input: theano.tensor.TensorType
        :param input: symbolic variable that describes the input of the
        architecture (one minibatch)
        :type n_in: int
        :param n_in: number of input units, the dimension of the space in
        which the datapoints lie
        :type n_hidden: int
        :param n_hidden: number of hidden units
        :type n_out: int
        :param n_out: number of output units, the dimension of the space in
        which the labels lie
        """

        # Since we are dealing with a one hidden layer MLP, this will translate
        # into a HiddenLayer with a tanh activation function connected to the
        # LogisticRegression layer; the activation function can be replaced by
        # sigmoid or any other nonlinear function

        self.srng = RandomStreams(seed=234)
        noisy_input = input + noise_level * self.srng.normal(input.shape)

        self.hiddenLayer = HiddenLayer(
            rng=rng,
            input=noisy_input,
            n_in=n_in,
            n_out=n_hidden,
            activation=T.tanh
        )

        # The logistic regression layer gets as input the hidden units
        # of the hidden layer
        self.logRegressionLayer = LogisticRegression(
            input=self.hiddenLayer.output,
            n_in=n_hidden,
            n_out=n_out
        )
        # end-snippet-2 start-snippet-3
        # L1 norm ; one regularization option is to enforce L1 norm to
        # be small
        self.L1 = (
            abs(self.hiddenLayer.W).sum()
            + abs(self.logRegressionLayer.W).sum()
        )

        # square of L2 norm ; one regularization option is to enforce
        # square of L2 norm to be small
        self.L2_sqr = (
            (self.hiddenLayer.W ** 2).sum()
            + (self.logRegressionLayer.W ** 2).sum()
        )

        # negative log likelihood of the MLP is given by the negative
        # log likelihood of the output of the model, computed in the
        # logistic regression layer
        self.negative_log_likelihood = (
            self.logRegressionLayer.negative_log_likelihood
        )
        # same holds for the function computing the number of errors
        self.errors = self.logRegressionLayer.errors

        # Trying to get to the prediction results ... -r
        self.y_prediction = self.logRegressionLayer.y_prediction

        # the parameters of the model are the parameters of the two layer it is
        # made out of
        self.params = self.hiddenLayer.params + self.logRegressionLayer.params
        # end-snippet-3

        # keep track of model input
        self.input = input




class DNN(object):
    """ Multilayer perceptron with multiple layers """

    def __init__(self, rng, input, n_in, n_layers, n_hidden, n_out, noise_level, activation_function=T.tanh):
        """Initialize the parameters for the multilayer perceptron
        :type rng: numpy.random.RandomState
        :param rng: a random number generator used to initialize weights
        :type input: theano.tensor.TensorType
        :param input: symbolic variable that describes the input of the
        architecture (one minibatch)
        :type n_in: int
        :param n_in: number of input units, the dimension of the space in
        which the datapoints lie
        :type n_hidden: int
        :param n_hidden: number of hidden units
        :type n_out: int
        :param n_out: number of output units, the dimension of the space in
        which the labels lie
        """

        if len(n_hidden) != n_layers:
            print >>sys.stderr, "Define %i number of hidden layer sizes" % n_layers
            return

        # Since we are dealing with a one hidden layer MLP, this will translate
        # into a HiddenLayer with a tanh activation function connected to the
        # LogisticRegression layer; the activation function can be replaced by
        # sigmoid or any other nonlinear function


        self.srng = RandomStreams(seed=234)
        noisy_input = input + noise_level * self.srng.normal(input.shape)

        hl_input = noisy_input
        hl_n_in = n_in
        self.hidden_layers = []

        for li in range(n_layers):

            hlayer = HiddenLayer(
                rng=rng,
                input=hl_input,
                n_in=hl_n_in,
                n_out=n_hidden[li],
                activation=activation_function
            )

            hl_n_in = n_hidden[li]
            hl_input = hlayer.output

            self.hidden_layers.append(hlayer)

        # The logistic regression layer gets as input the hidden units
        # of the hidden layer
        self.logRegressionLayer = LogisticRegression(
            input=self.hidden_layers[-1].output,
            n_in=n_hidden[-1],
            n_out=n_out
        )
        # end-snippet-2 start-snippet-3
        # L1 norm ; one regularization option is to enforce L1 norm to
        # be small

        self.L1 = abs(self.logRegressionLayer.W).sum()
        for hli in range(len(self.hidden_layers)):
            self.L1 += abs(self.hidden_layers[hli].W).sum()
        self.L1 = (self.L1)

        # square of L2 norm ; one regularization option is to enforce
        # square of L2 norm to be small

        self.L2_sqr = abs(self.logRegressionLayer.W ** 2).sum()
        for hli in range(len(self.hidden_layers)):
            self.L2_sqr += abs(self.hidden_layers[hli].W ** 2).sum()
        self.L2_sqr = (self.L2_sqr)

        # negative log likelihood of the MLP is given by the negative
        # log likelihood of the output of the model, computed in the
        # logistic regression layer
        self.negative_log_likelihood = (
            self.logRegressionLayer.negative_log_likelihood
        )
        # same holds for the function computing the number of errors
        self.errors = self.logRegressionLayer.errors

        self.params = self.logRegressionLayer.params
        for hli in range(len(self.hidden_layers)):
            self.params += self.hidden_layers[hli].params

        # keep track of model input
        self.input = input


def load_model_and_serve_socket(learning_rate=0.01, L1_reg=0.00, L2_reg=0.0001, n_epochs=1000,
             dataset='data2.hdfs', batch_size=20, n_hidden=500):
    """
    Demonstrate stochastic gradient descent optimization for a multilayer
    perceptron
    This is demonstrated on MNIST.
    :type learning_rate: float
    :param learning_rate: learning rate used (factor for the stochastic
    gradient
    :type L1_reg: float
    :param L1_reg: L1-norm's weight when added to the cost (see
    regularization)
    :type L2_reg: float
    :param L2_reg: L2-norm's weight when added to the cost (see
    regularization)
    :type n_epochs: int
    :param n_epochs: maximal number of epochs to run the optimizer
    :type dataset: string
    :param dataset: the path of the MNIST dataset file from
                 http://www.iro.umontreal.ca/~lisa/deep/data/mnist/mnist.pkl.gz
   """
    
    '''
    datasets = load_data(dataset)

    #train_set_x, train_set_y = datasets[0]
    #valid_set_x, valid_set_y = datasets[1]
    test_set_x, test_set_y = datasets[0]

    # compute number of minibatches for training, validation and testing
    #n_train_batches = train_set_x.get_value(borrow=True).shape[0] / batch_size
    #n_valid_batches = valid_set_x.get_value(borrow=True).shape[0] / batch_size
    n_test_batches = test_set_x.get_value(borrow=True).shape[0] / batch_size
    '''
    ######################
    # BUILD ACTUAL MODEL #
    ######################
    print '... building/loading the model'

    # For testing, let's override:

    batch_size=1

    # allocate symbolic variables for the data
    index = T.lscalar()  # index to a [mini]batch
    x = T.matrix('x')  # the data is presented as rasterized images
    y = T.ivector('y')  # the labels are presented as 1D vector of
                        # [int] labels

    noise_level = T.scalar('noise_level', dtype=theano.config.floatX)

    rng = numpy.random.RandomState(1234)

    # construct the MLP class
    classifier = MLP(
        rng=rng,
        input=x,
        n_in=270,
        n_hidden=n_hidden,
        n_out=55,
        noise_level=noise_level,
    )


    # construct the DNN
    """
    classifier = DNN(
        rng=rng,
        input=x,
        n_in=201,
        n_layers=2,
        n_hidden=[n_hidden,n_hidden],
        n_out=61
        activation_function=T.tanh
    )
    """

    # start-snippet-4
    # the cost we minimize during training is the negative log likelihood of
    # the model plus the regularization terms (L1 and L2); cost is expressed
    # here symbolically
    cost = (
        classifier.negative_log_likelihood(y)
        + L1_reg * classifier.L1
        + L2_reg * classifier.L2_sqr
    )
    # end-snippet-4



    f = file('PetersMLPmodel.epoch21.pkl', 'rb')    
    ok=True;
    n=0;
    while ok:
        try:
            classifier.params[n].set_value(cPickle.load(f))
            n+=1
        except:
            ok=False
            print ("There is no %ith parameter" % n)

    f.close()



    train_x=None
    train_y=None
    
    m=numpy.fromfile("phonestats.mean.np", dtype=numpy.float32)
    std=numpy.fromfile("phonestats.std.np", dtype=numpy.float32)

    
    index=0
    test_model = theano.function(
        inputs=[x, y],
        outputs=classifier.y_prediction(y),
        givens={
            noise_level: 0.0,
        }
    )



    # Connection handling! #

    # Get data from socket and do it!

    
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind((HOST, PORT))
    s.listen(1)
    
    integer_packer = struct.Struct('<i')
    two_integers_packer = struct.Struct('<'+2*'i')


    initialised = integer_packer.pack(-100);
    got_phone_index = integer_packer.pack(-200);
    got_data_len = integer_packer.pack(-300);
    got_data = integer_packer.pack(-400);
    here_comes_answer = integer_packer.pack(-500);

    print "Waiting for connection!"

    while 1:

        connectionstartstartmoment = time.clock()

        conn, addr = s.accept()
        print 'Connected by', addr

        #something = conn.recv(integer_packer.size)

        #unpacked_something = integer_packer.unpack(something)

        #print "Got something: "+str(unpacked_something);

        #conn.send(initialised)

        print "===== A new phone ====="

        while 1: 


            packed_phone_index = conn.recv(integer_packer.size)

            if not packed_phone_index:
                break;

            unpacked_phone_index = integer_packer.unpack(packed_phone_index)

            conn.send(got_phone_index)

            print "Unpacked_phone_index: "+str(unpacked_phone_index[0])

            packed_datalen = conn.recv(integer_packer.size)
            if not packed_datalen: 
                print "Not getting the right datalen!"
                conn.close()
                sys.exit(-2)

            unpacked_datalen = integer_packer.unpack(packed_datalen)

            print "Data length: " + str(unpacked_datalen)

            float_packer = struct.Struct( unpacked_datalen[0]*'f ')   


            conn.send(got_data_len)


            data = conn.recv(float_packer.size)
            if not data: 
                print "Not getting the right data!"
                conn.close()
                sys.exit(-1)

            print "Length of data: "+str(len(data))
            #print 'Received data: "%s"' % binascii.hexlify(data)

            unpacked_data = float_packer.unpack( data )


            
            #print unpacked_data
            print "Length of unpacked data: "+str(len(unpacked_data))


            conn.send(got_data)
            

            featdim=len(unpacked_data)
            test_x = np.reshape(np.array(unpacked_data), (-1, featdim))
            test_x = (test_x - m) / std
            test_y = [0];




            #test_set_x, test_set_y = shared_dataset((test_x,test_y))


            # compiling a Theano function that computes the mistakes that are made
            # by the model on a minibatch


            #  Classification here!  #



            teststartmoment= time.clock()

            foo=test_model(test_x, test_y)

            testtime = time.clock()-teststartmoment


            print "Tested data:"+str(foo[0][0])


            # Classification done, let's go back
            # to handling data transfer:

            return_data=[unpacked_phone_index[0], foo[0][0] ]

            print "Returning data "+str(return_data)

            encoded_answer = two_integers_packer.pack( return_data[0], return_data[1])

            conn.send(here_comes_answer)
            conn.send(encoded_answer)
                        

            print "===== A new phone ====="


        conn.close()


        connectiontime = time.clock() - connectionstartstartmoment

        print "Processing took %f s " % (connectiontime)

        print "Running test took %f s"  % (testtime)

        print "Waiting for next connection"




if __name__ == '__main__':
    if sys.argv[1] is not None:
        PORT=(int)(sys.argv[1])
    load_model_and_serve_socket()
